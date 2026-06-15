import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Sidebar from "../Sidebar.vue";

describe("Sidebar", () => {
  it("is not collapsed by default (sidebarWidth defaults to 260)", () => {
    const wrapper = mount(Sidebar);
    expect(wrapper.find(".sidebar").classes()).not.toContain("collapsed");
  });

  it("shows slot content by default", () => {
    const wrapper = mount(Sidebar, {
      slots: { default: "<div class='test-content'>Test</div>" },
    });
    const content = wrapper.find(".sidebar-content");
    expect(content.isVisible()).toBe(true);
  });

  it("does not have an internal toggle button", () => {
    const wrapper = mount(Sidebar);
    expect(wrapper.find(".toggle-btn").exists()).toBe(false);
  });
});
