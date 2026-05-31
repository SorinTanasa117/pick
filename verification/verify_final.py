from playwright.sync_api import Page, expect, sync_playwright
import time

def test_final(page: Page):
    # Go to the diary dashboard
    page.goto("http://localhost:3000")

    # Wait for the dashboard to load
    time.sleep(10)
    page.screenshot(path="verification/final_dashboard.png")

    # Open Add Entry sheet
    plus_button = page.locator("button").filter(has=page.locator("svg"))
    plus_button.click()
    time.sleep(2)
    page.screenshot(path="verification/final_sheet.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_final(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
