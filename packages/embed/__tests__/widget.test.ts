import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VERSION } from "../src/index";
import { setApiUrl } from "../src/api";
import { CymekWidget } from "../src/widget";

describe("embed package", () => {
  it("exports VERSION", () => {
    expect(VERSION).toBe("0.1.0");
  });

  it("setApiUrl sets the API base URL", () => {
    expect(() => setApiUrl("https://api.example.com")).not.toThrow();
  });
});

describe("CymekWidget", () => {
  let widget: CymekWidget;

  beforeEach(() => {
    document.body.innerHTML = "";
    widget = new CymekWidget({
      tenantId: "test-tenant",
      title: "Test Chat",
      placeholder: "Ask something...",
    });
  });

  afterEach(() => {
    widget.destroy();
  });

  it("creates bubble button on init", () => {
    widget.init();
    const bubble = document.getElementById("cymek-bubble");
    expect(bubble).not.toBeNull();
    expect(bubble?.querySelector("#cymek-bubble-btn")).not.toBeNull();
  });

  it("creates drawer on init", () => {
    widget.init();
    const drawer = document.getElementById("cymek-drawer");
    expect(drawer).not.toBeNull();
  });

  it("drawer has correct title from config", () => {
    widget.init();
    const title = document.querySelector("#cymek-drawer-title");
    expect(title?.textContent).toBe("Test Chat");
  });

  it("drawer has input with correct placeholder", () => {
    widget.init();
    const input = document.getElementById("cymek-input") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.placeholder).toBe("Ask something...");
  });

  it("opens drawer on toggle", () => {
    widget.init();
    widget.toggle();
    const drawer = document.getElementById("cymek-drawer");
    expect(drawer?.classList.contains("open")).toBe(true);
  });

  it("closes drawer on toggle twice", () => {
    widget.init();
    widget.toggle();
    widget.toggle();
    const drawer = document.getElementById("cymek-drawer");
    expect(drawer?.classList.contains("open")).toBe(false);
  });

  it("injects styles into head", () => {
    widget.init();
    const style = document.getElementById("cymek-embed-styles");
    expect(style).not.toBeNull();
    expect(style?.tagName).toBe("STYLE");
  });

  it("does not duplicate styles on second init", () => {
    widget.init();
    const widget2 = new CymekWidget({ tenantId: "t2" });
    widget2.init();
    const styles = document.querySelectorAll("#cymek-embed-styles");
    expect(styles.length).toBe(1);
    widget2.destroy();
  });

  it("disables send button when input is empty", () => {
    widget.init();
    widget.toggle();
    const btn = document.getElementById("cymek-send-btn") as HTMLButtonElement;
    const input = document.getElementById("cymek-input") as HTMLInputElement;
    expect(btn.disabled).toBe(true);
    input.value = "hello";
    input.dispatchEvent(new Event("input"));
    expect(btn.disabled).toBe(false);
  });

  it("destroy removes DOM elements", () => {
    widget.init();
    widget.destroy();
    expect(document.getElementById("cymek-bubble")).toBeNull();
    expect(document.getElementById("cymek-drawer")).toBeNull();
  });

  it("adds welcome message on init", () => {
    widget.init();
    const msgs = document.querySelectorAll(".cymek-msg");
    expect(msgs.length).toBe(1);
    expect(msgs[0].classList.contains("assistant")).toBe(true);
    expect(msgs[0].textContent).toContain("documentation assistant");
  });

  it("openDrawer hides bubble and shows drawer", () => {
    widget.init();
    widget.openDrawer();
    const bubble = document.getElementById("cymek-bubble");
    const drawer = document.getElementById("cymek-drawer");
    expect(bubble?.style.display).toBe("none");
    expect(drawer?.classList.contains("open")).toBe(true);
  });

  it("close hides drawer and shows bubble", () => {
    widget.init();
    widget.openDrawer();
    widget.close();
    const bubble = document.getElementById("cymek-bubble");
    const drawer = document.getElementById("cymek-drawer");
    expect(bubble?.style.display).toBe("flex");
    expect(drawer?.classList.contains("open")).toBe(false);
  });
});

describe("CymekWidget — config", () => {
  it("uses default title if not provided", () => {
    const w = new CymekWidget({ tenantId: "t" });
    w.init();
    const title = document.querySelector("#cymek-drawer-title");
    expect(title?.textContent).toBe("Cymek Chat");
    w.destroy();
  });

  it("uses custom primary color", () => {
    const w = new CymekWidget({ tenantId: "t", primaryColor: "#ff0000" });
    w.init();
    const style = document.getElementById("cymek-embed-styles");
    expect(style?.textContent).toContain("#ff0000");
    w.destroy();
  });

  it("escapes HTML in title", () => {
    const w = new CymekWidget({ tenantId: "t", title: "<script>alert('xss')</script>" });
    w.init();
    const title = document.querySelector("#cymek-drawer-title");
    expect(title?.textContent).toBe("<script>alert('xss')</script>");
    expect(title?.innerHTML).not.toContain("<script>");
    w.destroy();
  });
});
