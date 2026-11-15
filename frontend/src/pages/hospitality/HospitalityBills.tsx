import { useCallback, useEffect, useMemo, useState } from "react";
import Banknote from "lucide-react/dist/esm/icons/banknote.js";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.js";
import CreditCard from "lucide-react/dist/esm/icons/credit-card.js";
import FileText from "lucide-react/dist/esm/icons/file-text.js";
import Gift from "lucide-react/dist/esm/icons/gift.js";
import ReceiptText from "lucide-react/dist/esm/icons/receipt-text.js";
import Search from "lucide-react/dist/esm/icons/search.js";
import X from "lucide-react/dist/esm/icons/x.js";
import { apiFetch, displayError, jsonBody } from "../../lib/api";
import "./HospitalityBills.css";

type BillItem = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: string;
  note: string;
};
type BillOrder = {
  id: number;
  number: number;
  status: string;
  total: string;
  createdAt: string;
  items: BillItem[];
};
type Payment = {
  id: number;
  method: string;
  status: string;
  amount: string;
  reference: string;
  paidAt: string;
};
type Receipt = {
  number: string;
  issuedAt: string;
  snapshot: Record<string, unknown>;
};
type Bill = {
  id: number;
  publicIdentifier: string;
  number: string;
  status: string;
  table: string;
  customerName: string;
  customerPhone: string;
  subtotal: string;
  taxAmount: string;
  serviceChargeAmount: string;
  discountAmount: string;
  finalTotal: string;
  openedAt: string;
  paidAt: string | null;
  receipt: Receipt | null;
  loyaltyRewarded: boolean;
  payments: Payment[];
  orders: BillOrder[];
};
type Scope = "open" | "paid" | "closed";
type Summary = {
  open: number;
  openTotal: string;
  paidToday: number;
  paidTodayTotal: string;
};
type LoyaltyProgram = {
  isActive: boolean;
  programType?: "rewards" | "points" | "stamps";
};

const statusLabel: Record<string, string> = {
  open: "Open",
  paid: "Paid",
  complimentary: "Complimentary",
  voided: "Voided",
  refunded: "Refunded",
};
const paymentLabel: Record<string, string> = {
  cash: "Cash",
  online: "Online",
  complimentary: "Complimentary",
};
const money = (value: string | number) => Number(value || 0).toFixed(2);

function receiptHtml(bill: Bill) {
  const escape = (value: unknown) =>
    String(value ?? "").replace(
      /[&<>'"]/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[character] || character,
    );
  const items = bill.orders
    .flatMap((order) => order.items)
    .map(
      (item) =>
        `<tr><td>${escape(item.name)}${item.note ? `<small>${escape(item.note)}</small>` : ""}</td><td>${item.quantity}</td><td>Rs. ${money(Number(item.unitPrice) * item.quantity)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><head><title>${escape(bill.receipt?.number || bill.number)}</title><style>body{font:14px Arial,sans-serif;color:#172033;max-width:380px;margin:28px auto;padding:0 18px}h1{font-size:21px;margin:0 0 5px}p{color:#526174;margin:4px 0 18px}table{width:100%;border-collapse:collapse}td{padding:9px 0;border-bottom:1px solid #e4e8ee;vertical-align:top}td:nth-child(2){text-align:center}td:last-child{text-align:right}small{display:block;color:#68768a;margin-top:3px}.total td{border:0;padding:5px 0}.grand td{font-size:18px;font-weight:700;padding-top:11px;border-top:2px solid #172033}.status{margin-top:18px;padding:9px 11px;background:#eef5ff;border-radius:6px;font-weight:700}</style></head><body><h1>${escape(bill.receipt?.number || bill.number)}</h1><p>${escape(bill.table)} · ${new Date(bill.paidAt || bill.openedAt).toLocaleString()}</p><table><tbody>${items}<tr class="total"><td colspan="2">Subtotal</td><td>Rs. ${money(bill.subtotal)}</td></tr><tr class="total"><td colspan="2">Tax</td><td>Rs. ${money(bill.taxAmount)}</td></tr><tr class="total"><td colspan="2">Service charge</td><td>Rs. ${money(bill.serviceChargeAmount)}</td></tr><tr class="total"><td colspan="2">Discount</td><td>− Rs. ${money(bill.discountAmount)}</td></tr><tr class="grand"><td colspan="2">Total</td><td>Rs. ${money(bill.finalTotal)}</td></tr></tbody></table><div class="status">${escape(statusLabel[bill.status])}</div></body></html>`;
}

export function HospitalityBills({
  organizationId,
}: {
  organizationId: number;
}) {
  const [scope, setScope] = useState<Scope>("open");
  const [bills, setBills] = useState<Bill[]>([]);
  const [summary, setSummary] = useState<Summary>({
    open: 0,
    openTotal: "0",
    paidToday: 0,
    paidTodayTotal: "0",
  });
  const [loyalty, setLoyalty] = useState<LoyaltyProgram>({ isActive: false });
  const [selected, setSelected] = useState<Bill | null>(null);
  const [query, setQuery] = useState("");
  const [tax, setTax] = useState("0.00");
  const [serviceCharge, setServiceCharge] = useState("0.00");
  const [discount, setDiscount] = useState("0.00");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{
        bills: Bill[];
        summary: Summary;
        loyalty: LoyaltyProgram;
      }>(`/api/organizations/${organizationId}/venue/bills/?scope=${scope}`);
      setBills(data.bills);
      setSummary(data.summary);
      setLoyalty(data.loyalty);
    } catch (cause) {
      setError(displayError(cause));
    } finally {
      setLoading(false);
    }
  }, [organizationId, scope]);
  useEffect(() => {
    void load();
  }, [load]);

  const visibleBills = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? bills.filter((bill) =>
          `${bill.number} ${bill.table} ${bill.customerName} ${bill.customerPhone}`
            .toLowerCase()
            .includes(needle),
        )
      : bills;
  }, [bills, query]);

  function openBill(bill: Bill) {
    setSelected(bill);
    setTax(bill.taxAmount);
    setServiceCharge(bill.serviceChargeAmount);
    setDiscount(bill.discountAmount);
    setMethod("cash");
    setReference("");
    setReason("");
    setMemberCode("");
    setError("");
    setNotice("");
  }

  async function mutate(
    action: string,
    extra: Record<string, unknown> = {},
    close = true,
  ) {
    if (!selected) return false;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/bills/`, {
        method: "PATCH",
        body: jsonBody({ id: selected.id, action, ...extra }),
      });
      setNotice(
        action === "settle"
          ? "Payment recorded and receipt created."
          : action === "refund"
            ? "Refund recorded."
            : action === "void"
              ? "Bill voided."
              : action === "loyalty_award"
                ? "Loyalty credit added."
                : "Bill updated.",
      );
      if (close) setSelected(null);
      await load();
      return true;
    } catch (cause) {
      setError(displayError(cause));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveCharges(close = true) {
    return mutate(
      "update",
      {
        taxAmount: tax,
        serviceChargeAmount: serviceCharge,
        discountAmount: discount,
        reason: reason || "Bill charges updated",
      },
      close,
    );
  }

  async function settle() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/bills/`, {
        method: "PATCH",
        body: jsonBody({
          id: selected.id,
          action: "update",
          taxAmount: tax,
          serviceChargeAmount: serviceCharge,
          discountAmount: discount,
          reason: reason || "Final charges confirmed",
        }),
      });
      await apiFetch(`/api/organizations/${organizationId}/venue/bills/`, {
        method: "PATCH",
        body: jsonBody({
          id: selected.id,
          action: "settle",
          method,
          reference,
        }),
      });
      setSelected(null);
      setNotice("Payment recorded and receipt created.");
      await load();
    } catch (cause) {
      setError(displayError(cause));
    } finally {
      setSaving(false);
    }
  }

  function printReceipt(bill: Bill) {
    const receiptWindow = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=440,height=720",
    );
    if (!receiptWindow) {
      setError("Allow pop-ups to print this receipt.");
      return;
    }
    receiptWindow.document.write(receiptHtml(bill));
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  }

  return (
    <div className="hospitality-bills-page">
      {error ? (
        <div className="manage-alert" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="manage-alert is-success" role="status">
          {notice}
        </div>
      ) : null}

      <section
        className="hospitality-bill-summary"
        aria-label="Billing summary"
      >
        <article>
          <span>
            <FileText size={18} />
          </span>
          <div>
            <small>Open bills</small>
            <strong>{summary.open}</strong>
          </div>
        </article>
        <article>
          <span>
            <ReceiptText size={18} />
          </span>
          <div>
            <small>Open value</small>
            <strong>Rs. {money(summary.openTotal)}</strong>
          </div>
        </article>
        <article>
          <span>
            <CheckCircle2 size={18} />
          </span>
          <div>
            <small>Paid today</small>
            <strong>{summary.paidToday}</strong>
          </div>
        </article>
        <article>
          <span>
            <Banknote size={18} />
          </span>
          <div>
            <small>Collected today</small>
            <strong>Rs. {money(summary.paidTodayTotal)}</strong>
          </div>
        </article>
      </section>

      <section className="hospitality-bills-card">
        <header>
          <div>
            <h2>Bills</h2>
            <p>Settle a whole table session and keep its receipt history.</p>
          </div>
        </header>
        <div className="hospitality-bills-toolbar">
          <nav aria-label="Bill status">
            <button
              className={scope === "open" ? "is-active" : ""}
              onClick={() => setScope("open")}
            >
              Open
            </button>
            <button
              className={scope === "paid" ? "is-active" : ""}
              onClick={() => setScope("paid")}
            >
              Paid
            </button>
            <button
              className={scope === "closed" ? "is-active" : ""}
              onClick={() => setScope("closed")}
            >
              Voided & refunded
            </button>
          </nav>
          <label>
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search bill or table"
              aria-label="Search bills"
            />
          </label>
        </div>
        <div
          className="hospitality-bills-table"
          role="table"
          aria-label={`${scope} bills`}
        >
          <div className="hospitality-bills-head" role="row">
            <span>Bill</span>
            <span>Table</span>
            <span>Orders</span>
            <span>Status</span>
            <span>Total</span>
            <span aria-hidden="true" />
          </div>
          {visibleBills.map((bill) => (
            <button
              type="button"
              role="row"
              key={bill.id}
              onClick={() => openBill(bill)}
            >
              <span>
                <strong>{bill.number}</strong>
                <small>
                  {new Date(bill.paidAt || bill.openedAt).toLocaleString()}
                </small>
              </span>
              <span>{bill.table}</span>
              <span>{bill.orders.length}</span>
              <span>
                <em className={`is-${bill.status}`}>
                  {statusLabel[bill.status]}
                </em>
              </span>
              <span>
                <strong>Rs. {money(bill.finalTotal)}</strong>
              </span>
              <span>View</span>
            </button>
          ))}
          {!loading && !visibleBills.length ? (
            <div className="hospitality-bills-empty">
              <ReceiptText size={42} />
              <strong>
                {scope === "open"
                  ? "No open bills"
                  : scope === "paid"
                    ? "No paid bills yet"
                    : "No voided or refunded bills"}
              </strong>
              <p>
                {scope === "open"
                  ? "A bill appears after a waiter verifies the first order for a table."
                  : "Bills will remain here for review and receipt reprinting."}
              </p>
            </div>
          ) : null}
          {loading ? (
            <div className="hospitality-bills-empty">
              <p>Loading bills…</p>
            </div>
          ) : null}
        </div>
      </section>

      {selected ? (
        <div className="hospitality-bill-backdrop" role="presentation">
          <section
            className="hospitality-bill-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bill-drawer-title"
          >
            <header>
              <div>
                <small>{selected.table.toUpperCase()}</small>
                <h2 id="bill-drawer-title">{selected.number}</h2>
                <p>
                  {selected.orders.length} order
                  {selected.orders.length === 1 ? "" : "s"} in this table
                  session
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close bill"
              >
                <X size={20} />
              </button>
            </header>
            <div className="hospitality-bill-drawer-body">
              <section className="hospitality-bill-orders">
                <h3>Order details</h3>
                {selected.orders.map((order) => (
                  <article key={order.id}>
                    <header>
                      <strong>Order #{order.number}</strong>
                      <small>
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    </header>
                    {order.items.map((item) => (
                      <div key={item.id}>
                        <span>
                          {item.quantity}× {item.name}
                          {item.note ? <small>{item.note}</small> : null}
                        </span>
                        <strong>
                          Rs. {money(Number(item.unitPrice) * item.quantity)}
                        </strong>
                      </div>
                    ))}
                  </article>
                ))}
              </section>
              <section className="hospitality-bill-totals">
                <div>
                  <span>Subtotal</span>
                  <strong>Rs. {money(selected.subtotal)}</strong>
                </div>
                {selected.status === "open" ? (
                  <>
                    <label>
                      <span>Tax</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tax}
                        onChange={(event) => setTax(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Service charge</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={serviceCharge}
                        onChange={(event) =>
                          setServiceCharge(event.target.value)
                        }
                      />
                    </label>
                    <label>
                      <span>Discount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(event) => setDiscount(event.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <div>
                      <span>Tax</span>
                      <strong>Rs. {money(selected.taxAmount)}</strong>
                    </div>
                    <div>
                      <span>Service charge</span>
                      <strong>Rs. {money(selected.serviceChargeAmount)}</strong>
                    </div>
                    <div>
                      <span>Discount</span>
                      <strong>− Rs. {money(selected.discountAmount)}</strong>
                    </div>
                  </>
                )}
                <div className="is-total">
                  <span>Final total</span>
                  <strong>
                    Rs.{" "}
                    {selected.status === "open"
                      ? money(
                          Number(selected.subtotal) +
                            Number(tax || 0) +
                            Number(serviceCharge || 0) -
                            Number(discount || 0),
                        )
                      : money(selected.finalTotal)}
                  </strong>
                </div>
              </section>
              {selected.status === "open" ? (
                <section className="hospitality-bill-payment">
                  <h3>Collect payment</h3>
                  <div className="hospitality-payment-methods">
                    <button
                      className={method === "cash" ? "is-active" : ""}
                      onClick={() => setMethod("cash")}
                    >
                      <Banknote size={17} />
                      Cash
                    </button>
                    <button
                      className={method === "online" ? "is-active" : ""}
                      onClick={() => setMethod("online")}
                    >
                      <CreditCard size={17} />
                      Online
                    </button>
                    <button
                      className={method === "complimentary" ? "is-active" : ""}
                      onClick={() => setMethod("complimentary")}
                    >
                      <CheckCircle2 size={17} />
                      Complimentary
                    </button>
                  </div>
                  <label>
                    Payment reference <small>optional</small>
                    <input
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                      placeholder="Transaction or note reference"
                    />
                  </label>
                  <label>
                    Change reason <small>recommended for discounts</small>
                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Why were charges changed?"
                    />
                  </label>
                </section>
              ) : (
                <>
                  <section className="hospitality-bill-payment-summary">
                    <em className={`is-${selected.status}`}>
                      {statusLabel[selected.status]}
                    </em>
                    {selected.payments.map((payment) => (
                      <p key={payment.id}>
                        {paymentLabel[payment.method] || payment.method} · Rs.{" "}
                        {money(payment.amount)}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </p>
                    ))}
                    {selected.receipt ? (
                      <strong>{selected.receipt.number}</strong>
                    ) : null}
                  </section>
                  {selected.status === "paid" ||
                  selected.status === "complimentary" ? (
                    <label className="hospitality-bill-refund-reason">
                      Refund reason <small>required</small>
                      <input
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Why is this bill being refunded?"
                      />
                    </label>
                  ) : null}
                  {selected.status === "paid" && loyalty.isActive ? (
                    <section className="hospitality-bill-loyalty">
                      <h3>Loyalty</h3>
                      {selected.loyaltyRewarded ? (
                        <p>
                          <CheckCircle2 size={16} /> Loyalty credit has already
                          been added for this bill.
                        </p>
                      ) : (
                        <div>
                          <input
                            value={memberCode}
                            onChange={(event) =>
                              setMemberCode(event.target.value)
                            }
                            placeholder="Scan or enter member code"
                          />
                          <button
                            className="manage-button"
                            type="button"
                            disabled={saving || !memberCode.trim()}
                            onClick={() =>
                              void mutate("loyalty_award", {
                                memberId: memberCode,
                              })
                            }
                          >
                            <Gift size={16} /> Add{" "}
                            {loyalty.programType === "stamps"
                              ? "stamp"
                              : loyalty.programType === "points"
                                ? "points"
                                : "reward"}
                          </button>
                        </div>
                      )}
                    </section>
                  ) : null}
                </>
              )}
            </div>
            <footer>
              {selected.status === "open" ? (
                <>
                  <button
                    className="manage-button is-danger"
                    type="button"
                    disabled={saving || reason.trim().length < 3}
                    onClick={() => void mutate("void", { reason })}
                  >
                    Void bill
                  </button>
                  <span />
                  <button
                    className="manage-button"
                    type="button"
                    disabled={saving}
                    onClick={() => void saveCharges()}
                  >
                    Save charges
                  </button>
                  <button
                    className="manage-button is-primary"
                    type="button"
                    disabled={saving}
                    onClick={() => void settle()}
                  >
                    {saving
                      ? "Saving…"
                      : `Collect ${method === "complimentary" ? "as complimentary" : "payment"}`}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="manage-button is-danger"
                    type="button"
                    disabled={
                      saving ||
                      reason.trim().length < 3 ||
                      selected.status === "refunded" ||
                      selected.status === "voided"
                    }
                    onClick={() => void mutate("refund", { reason })}
                  >
                    Refund
                  </button>
                  <span />
                  <button
                    className="manage-button is-primary"
                    type="button"
                    disabled={!selected.receipt}
                    onClick={() => printReceipt(selected)}
                  >
                    <ReceiptText size={16} />
                    Print receipt
                  </button>
                </>
              )}
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
