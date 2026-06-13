import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../App.vue";
import Toolbar from "../components/toolbar/Toolbar.vue";
import Sidebar from "../components/layout/Sidebar.vue";

describe("App", () => {
  it("renders Toolbar at the top", () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          FileTree: true,
          TabBar: true,
          MarkdownEditor: true,
        },
      },
    });
    expect(wrapper.findComponent(Toolbar).exists()).toBe(true);
  });

  it("renders Sidebar with collapsed prop", () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          FileTree: true,
          TabBar: true,
          MarkdownEditor: true,
        },
      },
    });
    const sidebar = wrapper.findComponent(Sidebar);
    expect(sidebar.exists()).toBe(true);
    expect(sidebar.props("collapsed")).toBe(false);
  });

  it("has correct layout hierarchy: toolbar on top, container below", () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          FileTree: true,
          TabBar: true,
          MarkdownEditor: true,
        },
      },
    });

    const appWrapper = wrapper.find(".app-wrapper");
    expect(appWrapper.exists()).toBe(true);

    const children = appWrapper.element.children;
    expect(children[0].classList.contains("toolbar")).toBe(true);
    expect(children[1].classList.contains("container")).toBe(true);
  });
});
