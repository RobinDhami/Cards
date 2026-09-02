import json
from copy import deepcopy

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from .models import CardAsset, CardDesign, CardTemplate, CardTemplateVersion


TEST_DOCUMENT = {
    "version": 2,
    "background": {"type": "solid", "color": "#ffffff"},
    "elements": [
        {
            "id": "full-name",
            "type": "text",
            "name": "Full Name",
            "x": 100,
            "y": 120,
            "width": 300,
            "height": 50,
            "rotation": 0,
            "opacity": 1,
            "text": "{{full_name}}",
        }
    ],
    "guides": {"horizontal": [], "vertical": []},
}


@override_settings(PRIVATE_CARD_MEDIA_ROOT="test_private_card_media")
class CardDesignerApiTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", password="secret")
        self.other = User.objects.create_user("other", password="secret")
        self.admin = User.objects.create_superuser(
            "admin",
            "admin@example.com",
            "secret",
        )
        self.template = CardTemplate.objects.create(
            name="Published",
            status=CardTemplate.STATUS_PUBLISHED,
            version=1,
            front_data=deepcopy(TEST_DOCUMENT),
            back_data=deepcopy(TEST_DOCUMENT),
            created_by=self.admin,
        )

    def test_bootstrap_is_public_but_only_returns_published_templates(self):
        CardTemplate.objects.create(
            name="Draft",
            front_data=deepcopy(TEST_DOCUMENT),
            back_data=deepcopy(TEST_DOCUMENT),
        )
        response = self.client.get("/api/card-designer/bootstrap/")
        self.assertEqual(response.status_code, 200)
        names = {template["name"] for template in response.json()["templates"]}
        self.assertIn("Published", names)
        self.assertNotIn("Draft", names)

    def test_designs_are_owner_scoped(self):
        self.client.login(username="owner", password="secret")
        response = self.client.post(
            "/api/card-designer/designs/",
            data=json.dumps(
                {
                    "name": "Owner card",
                    "frontData": TEST_DOCUMENT,
                    "backData": TEST_DOCUMENT,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        design_id = response.json()["design"]["id"]

        self.client.logout()
        self.client.login(username="other", password="secret")
        denied = self.client.get(f"/api/card-designer/designs/{design_id}/")
        self.assertEqual(denied.status_code, 403)

    def test_designs_accept_editor_icons_and_decorations(self):
        document = deepcopy(TEST_DOCUMENT)
        document["elements"].extend(
            [
                {
                    "id": "phone-icon",
                    "type": "icon",
                    "name": "Phone Icon",
                    "x": 40,
                    "y": 40,
                    "width": 72,
                    "height": 72,
                    "rotation": 0,
                    "opacity": 1,
                    "icon": "telephone",
                },
                {
                    "id": "corner-accent",
                    "type": "decoration",
                    "name": "Corner Accent",
                    "x": 0,
                    "y": 0,
                    "width": 180,
                    "height": 180,
                    "rotation": 0,
                    "opacity": 0.8,
                    "decoration": "luxury-gold-accent",
                },
            ]
        )
        self.client.login(username="owner", password="secret")
        response = self.client.post(
            "/api/card-designer/designs/",
            data=json.dumps(
                {
                    "name": "Element library card",
                    "frontData": document,
                    "backData": TEST_DOCUMENT,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["design"]["frontData"]["elements"][1]["type"], "icon")
        self.assertEqual(response.json()["design"]["frontData"]["elements"][2]["type"], "decoration")

    def test_using_template_copies_document(self):
        self.client.login(username="owner", password="secret")
        response = self.client.post(
            f"/api/card-designer/templates/{self.template.id}/use/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        design = CardDesign.objects.get(pk=response.json()["design"]["id"])
        self.template.front_data["elements"][0]["text"] = "Changed later"
        self.template.save()
        design.refresh_from_db()
        self.assertEqual(design.front_data["elements"][0]["text"], "{{full_name}}")

    def test_only_superuser_can_publish_template(self):
        draft = CardTemplate.objects.create(
            name="Draft template",
            front_data=deepcopy(TEST_DOCUMENT),
            back_data=deepcopy(TEST_DOCUMENT),
        )
        self.client.login(username="owner", password="secret")
        denied = self.client.post(
            f"/api/card-designer/templates/{draft.id}/",
            data=json.dumps({"action": "publish", "confirm": True}),
            content_type="application/json",
        )
        self.assertEqual(denied.status_code, 403)

        self.client.logout()
        self.client.login(username="admin", password="secret")
        published = self.client.post(
            f"/api/card-designer/templates/{draft.id}/",
            data=json.dumps({"action": "publish", "confirm": True}),
            content_type="application/json",
        )
        self.assertEqual(published.status_code, 200)
        self.assertEqual(published.json()["template"]["status"], "published")
        self.assertEqual(draft.versions.count(), 1)

    def test_deleting_published_template_removes_active_record_and_version_history(self):
        CardTemplateVersion.objects.create(
            template=self.template,
            version=1,
            name=self.template.name,
            category=self.template.category,
        )
        self.client.login(username="admin", password="secret")

        deleted = self.client.delete(
            f"/api/card-designer/templates/{self.template.id}/",
            data=json.dumps({"confirm": True}),
            content_type="application/json",
        )

        self.assertEqual(deleted.status_code, 200)
        self.assertFalse(CardTemplate.objects.filter(pk=self.template.id).exists())
        self.assertFalse(
            CardTemplateVersion.objects.filter(template_id=self.template.id).exists()
        )
        self.assertEqual(
            self.client.get("/api/card-designer/templates/?manage=1").json()["templates"],
            [],
        )
        self.assertEqual(
            self.client.get("/api/card-designer/bootstrap/").json()["templates"],
            [],
        )

    def test_empty_template_lists_remain_empty_across_repeated_requests(self):
        CardTemplate.objects.all().delete()
        self.client.login(username="admin", password="secret")

        for _ in range(2):
            self.assertEqual(
                self.client.get("/api/card-designer/templates/?manage=1").json()["templates"],
                [],
            )
            self.assertEqual(
                self.client.get("/api/card-designer/bootstrap/").json()["templates"],
                [],
            )

    def test_private_asset_file_is_owner_only(self):
        asset = CardAsset.objects.create(
            owner=self.owner,
            uploaded_by=self.owner,
            name="logo.png",
            asset_type="company_logo",
            file=SimpleUploadedFile(
                "logo.png",
                b"\x89PNG\r\n\x1a\n",
                content_type="image/png",
            ),
            mime_type="image/png",
            file_size=8,
        )
        self.client.login(username="other", password="secret")
        response = self.client.get(f"/api/card-designer/assets/{asset.id}/file/")
        self.assertEqual(response.status_code, 403)
