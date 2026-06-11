import os

import pytest
import requests


BASE_URL = os.getenv("SMOKE_BASE_URL", "https://lotto-usa-production.up.railway.app").rstrip("/")


def fetch(path: str, *, allow_redirects: bool = True) -> requests.Response:
    response = requests.get(f"{BASE_URL}{path}", allow_redirects=allow_redirects, timeout=20)
    return response


def test_homepage_loads():
    response = fetch("/")

    assert response.status_code == 200
    assert "LottoUSA" in response.text
    assert ">Admin<" not in response.text


def test_login_page_loads():
    response = fetch("/login")

    assert response.status_code == 200
    assert "เข้าสู่ระบบ" in response.text or "Login" in response.text
    assert "/admin-login" not in response.text


def test_register_has_referral_code_field():
    response = fetch("/register")

    assert response.status_code == 200
    assert "รหัสผู้แนะนำ" in response.text
    assert "ใส่ได้ครั้งเดียวตอนสมัคร" in response.text


def test_payment_page_has_slip_upload():
    response = fetch("/payment")

    assert response.status_code == 200
    assert "อัปโหลดสลิป" in response.text
    assert "ส่งสลิปให้แอดมินตรวจสอบ" in response.text


def test_admin_tickets_redirect_for_guests():
    response = fetch("/admin/tickets", allow_redirects=False)

    assert response.status_code in {302, 307, 308}
    assert response.headers["Location"] == "/admin-login"


def test_guest_cannot_open_powerball_directly():
    response = fetch("/power-ball", allow_redirects=False)

    assert response.status_code in {302, 307, 308}
    assert response.headers["Location"] == "/login"


def test_guest_cannot_open_admin_orders_directly():
    response = fetch("/admin/orders", allow_redirects=False)

    assert response.status_code in {302, 307, 308}
    assert response.headers["Location"] == "/admin-login"


def test_admin_login_page_loads():
    response = fetch("/admin-login")

    assert response.status_code == 200
    assert "ADMIN ONLY" in response.text


@pytest.mark.parametrize(
    ("path", "expected_text"),
    [
        ("/admin/orders", "/admin-login"),
        ("/admin/members", "/admin-login"),
    ],
)
def test_admin_routes_redirect_for_guests(path: str, expected_text: str):
    response = fetch(path, allow_redirects=False)

    assert response.status_code in {302, 307, 308}
    assert response.headers["Location"] == expected_text
