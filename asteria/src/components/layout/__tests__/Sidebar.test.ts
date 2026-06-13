import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Sidebar from "../Sidebar.vue";

describe("Sidebar", () => {
  it("has collapsed class when collapsed prop is true", () => {
    const wrapper = mount(Sidebar, { props: { collapsed: true } });
    expect(wrapper.find(".sidebar").classes()).toContain("collapsed");
  });

  it("does not have collapsed class when collapsed prop is false", () => {
    const wrapper = mount(Sidebar, { props: { collapsed: false } });
    expect(wrapper.find(".sidebar").classes()).not.toContain("collapsed");
  });

  it("defaults collapsed to false when no prop given", () => {
    const wrapper = mount(Sidebar);
    expect(wrapper.find(".sidebar").classes()).not.toContain("collapsed");
  });

  it("hides slot content when collapsed", () => {
    const wrapper = mount(Sidebar, {
      props: { collapsed: true },
      slots: { default: "<div class='test-content'>Test</div>" },
    });
    const content = wrapper.find(".sidebar-content");
    expect(content.isVisible()).toBe(false);
  });

  it("shows slot content when not collapsed", () => {
    const wrapper = mount(Sidebar, {
      props: { collapsed: false },
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
