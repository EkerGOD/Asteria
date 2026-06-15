import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    onCloseRequested: vi.fn(),
  })),
}));

vi.mock("@tauri-apps/plugin-store", () => ({
  Store: {
    load: vi.fn(() =>
      Promise.resolve({
        get: vi.fn(() => Promise.resolve(null)),
        set: vi.fn(() => Promise.resolve()),
        save: vi.fn(() => Promise.resolve()),
      })
    ),
  },
}));

import App from "../App.vue";
import Toolbar from "../components/toolbar/Toolbar.vue";
import Sidebar from "../components/layout/Sidebar.vue";
import ActivityBar from "../components/activity-bar/ActivityBar.vue";
import FileTree from "../components/file-tree/FileTree.vue";
import SearchPanel from "../components/search/SearchPanel.vue";
import { useActivityBar } from "../composables/useActivityBar";

describe("App", () => {
  beforeEach(() => {
    useActivityBar().setActivity("files");
  });

  it("renders Toolbar at the top", () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          FileTree: true,
          TabBar: true,
          MarkdownEditor: true,
          SearchPanel: true,
          StatusBar: true,
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
          SearchPanel: true,
          StatusBar: true,
        },
      },
    });
    const sidebar = wrapper.findComponent(Sidebar);
    expect(sidebar.exists()).toBe(true);
  });

  it("has correct layout hierarchy: toolbar on top, container below", () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          FileTree: true,
          TabBar: true,
          MarkdownEditor: true,
          SearchPanel: true,
          StatusBar: true,
        },
      },
    });

    const appWrapper = wrapper.find(".app-wrapper");
    expect(appWrapper.exists()).toBe(true);

    const children = appWrapper.element.children;
    expect(children[0].classList.contains("toolbar")).toBe(true);
    expect(children[1].classList.contains("container")).toBe(true);
  });

  describe("activity bar", () => {
    it("renders ActivityBar inside the container", () => {
      const wrapper = mount(App, {
        global: {
          stubs: {
            FileTree: true,
            TabBar: true,
            MarkdownEditor: true,
            SearchPanel: true,
          },
        },
      });
      expect(wrapper.findComponent(ActivityBar).exists()).toBe(true);
    });

    it("shows FileTree in sidebar when active activity is files", () => {
      useActivityBar().setActivity("files");
      const wrapper = mount(App, {
        global: {
          stubs: {
            TabBar: true,
            MarkdownEditor: true,
            SearchPanel: true,
          },
        },
      });
      expect(wrapper.findComponent(FileTree).exists()).toBe(true);
      const searchPanel = wrapper.findComponent(SearchPanel);
      expect(searchPanel.isVisible()).toBe(false);
    });

    it("shows SearchPanel in sidebar when active activity is search", () => {
      useActivityBar().setActivity("search");
      const wrapper = mount(App, {
        global: {
          stubs: {
            TabBar: true,
            MarkdownEditor: true,
            FileTree: true,
          },
        },
      });
      expect(wrapper.findComponent(SearchPanel).exists()).toBe(true);
      const fileTree = wrapper.findComponent(FileTree);
      expect(fileTree.isVisible()).toBe(false);
    });
  });
});
