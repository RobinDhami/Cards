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
type ReceiptSnapshot = {
  business?: { name?: string; address?: string; phone?: string };
};
type Receipt = {
  number: string;
  issuedAt: string;
  snapshot: ReceiptSnapshot;
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
  const business = bill.receipt?.snapshot.business;
  const issuedAt = new Date(bill.paidAt || bill.openedAt);
  const issuedAtLabel = issuedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const payment = bill.payments[0];
  const items = bill.orders
    .flatMap((order) => order.items)
    .map(
      (item) =>
        `<tr><td>${escape(item.name)}${item.note ? `<small>${escape(item.note)}</small>` : ""}</td><td>${item.quantity}</td><td>Rs. ${money(Number(item.unitPrice) * item.quantity)}</td></tr>`,
    )
    .join("");
  const optionalCharges = [
    Number(bill.taxAmount) ? `<tr><td colspan="2">Tax</td><td>Rs. ${money(bill.taxAmount)}</td></tr>` : "",
    Number(bill.serviceChargeAmount) ? `<tr><td colspan="2">Service charge</td><td>Rs. ${money(bill.serviceChargeAmount)}</td></tr>` : "",
    Number(bill.discountAmount) ? `<tr><td colspan="2">Discount</td><td>− Rs. ${money(bill.discountAmount)}</td></tr>` : "",
  ].join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(bill.receipt?.number || bill.number)}</title><style>@page{size:80mm auto;margin:7mm}*{box-sizing:border-box}body{width:66mm;margin:0 auto;color:#151515;background:#fff;font:12px/1.4 Arial,Helvetica,sans-serif}.receipt-header{text-align:center}.receipt-header h1{margin:0 0 5px;font-size:21px;line-height:1.15;letter-spacing:-.2px}.receipt-header p{margin:1px 0;color:#292929}.rule{margin:15px 0;border:0;border-top:2px dotted #3d3d3d}.meta{display:grid;gap:3px}.meta-row{display:flex;justify-content:space-between;gap:12px}.meta-row span:last-child{text-align:right}.items{width:100%;border-collapse:collapse}.items th{padding:0 0 8px;text-align:left;font-size:11px;font-weight:500}.items th:nth-child(2),.items td:nth-child(2){width:12%;text-align:center}.items th:last-child,.items td:last-child{width:31%;text-align:right}.items td{padding:4px 0;vertical-align:top}.items small{display:block;margin-top:1px;color:#555;font-size:10px}.summary{width:100%;border-collapse:collapse}.summary td{padding:3px 0}.summary td:last-child{text-align:right}.summary .grand td{padding-top:9px;border-top:1px solid #222;font-size:18px;font-weight:800}.payment{margin:11px 0 0;text-align:center;font-size:11px}.payment strong{font-size:12px}.thanks{margin:16px 0 0;text-align:center;font-size:15px;font-weight:800;letter-spacing:.2px}.receipt-number{margin-top:9px;text-align:center;color:#555;font-size:10px}@media print{body{width:auto}.receipt-header h1{font-size:20px}}</style></head><body><header class="receipt-header"><h1>${escape(business?.name || "Receipt")}</h1>${business?.address ? `<p>${escape(business.address)}</p>` : ""}${business?.phone ? `<p>Tel: ${escape(business.phone)}</p>` : ""}</header><hr class="rule"><section class="meta"><div class="meta-row"><span>Receipt: ${escape(bill.receipt?.number || bill.number)}</span><span>${escape(bill.table)}</span></div><div class="meta-row"><span>${escape(issuedAtLabel)}</span><span>${escape(statusLabel[bill.status] || bill.status)}</span></div></section><hr class="rule"><table class="items"><thead><tr><th>Name</th><th>Qty</th><th>Price</th></tr></thead><tbody>${items}</tbody></table><hr class="rule"><table class="summary"><tbody><tr><td colspan="2">Subtotal</td><td>Rs. ${money(bill.subtotal)}</td></tr>${optionalCharges}<tr class="grand"><td colspan="2">Total</td><td>Rs. ${money(bill.finalTotal)}</td></tr></tbody></table>${payment ? `<p class="payment"><strong>Paid by ${escape(paymentLabel[payment.method] || payment.method)}</strong>${payment.reference ? `<br>${escape(payment.reference)}` : ""}</p>` : ""}<p class="thanks">THANK YOU!</p><p class="receipt-number">${escape(bill.receipt?.number || bill.number)}</p></body></html>`;
}

export function HospitalityBills({
  organizationId,
  role,
}: {
  organizationId: number;
  role: string;
}) {
  const canManageBills = role === "owner" || role === "manager";
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
      if (canManageBills) {
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
      }
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
      "width=440,height=720",
    );
    if (!receiptWindow) {
      setError("Allow pop-ups to print this receipt.");
      return;
    }
    // `noopener` on an about:blank popup makes Chrome detach the new window
    // before its document can be populated, leaving staff with a blank tab.
    // This page is generated locally and contains no external navigation.
    try {
      receiptWindow.opener = null;
      receiptWindow.document.open();
      receiptWindow.document.write(receiptHtml(bill));
      receiptWindow.document.close();
      let printed = false;
      const printWhenReady = () => {
        if (printed || receiptWindow.closed) return;
        printed = true;
        receiptWindow.focus();
        receiptWindow.print();
      };
      receiptWindow.addEventListener("load", () => window.setTimeout(printWhenReady, 100), { once: true });
      // Some browsers mark an about:blank window as loaded before the listener
      // is attached, so keep a small ready-state fallback.
      if (receiptWindow.document.readyState === "complete") window.setTimeout(printWhenReady, 100);
    } catch {
      receiptWindow.close();
      setError("We could not prepare this receipt. Please try again.");
    }
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
                {selected.status === "open" && canManageBills ? (
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
                    {selected.status === "open" && canManageBills
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
                    {canManageBills ? <button
                      className={method === "complimentary" ? "is-active" : ""}
                      onClick={() => setMethod("complimentary")}
                    >
                      <CheckCircle2 size={17} />
                      Complimentary
                    </button> : null}
                  </div>
                  <label>
                    Payment reference <small>optional</small>
                    <input
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                      placeholder="Transaction or note reference"
                    />
                  </label>
                  {canManageBills ? <label>
                    Change reason <small>recommended for discounts</small>
                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Why were charges changed?"
                    />
                  </label> : null}
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
                  {canManageBills && (selected.status === "paid" ||
                  selected.status === "complimentary") ? (
                    <label className="hospitality-bill-refund-reason">
                      Refund reason <small>required</small>
                      <input
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Why is this bill being refunded?"
                      />
                    </label>
                  ) : null}
                  {canManageBills && selected.status === "paid" && loyalty.isActive ? (
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
                  {canManageBills ? <button
                    className="manage-button is-danger"
                    type="button"
                    disabled={saving || reason.trim().length < 3}
                    onClick={() => void mutate("void", { reason })}
                  >
                    Void bill
                  </button> : null}
                  <span />
                  {canManageBills ? <button
                    className="manage-button"
                    type="button"
                    disabled={saving}
                    onClick={() => void saveCharges()}
                  >
                    Save charges
                  </button> : null}
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
                  {canManageBills ? <button
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
                  </button> : null}
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
