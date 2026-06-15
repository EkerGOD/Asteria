import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import MenuDropdown from "../MenuDropdown.vue";
import type { MenuItem } from "../MenuDropdown.vue";

const sampleItems: MenuItem[] = [
  { id: "open-folder", label: "Open Folder", icon: "codicon-folder-opened", shortcut: "Ctrl+K Ctrl+O" },
  { id: "save", label: "Save", shortcut: "Ctrl+S" },
  { id: "sep-1", label: "", type: "separator" },
  { id: "exit", label: "Exit" },
];

function mountDropdown(items = sampleItems, visible = true) {
  return mount(MenuDropdown, {
    props: { items, visible },
  });
}

describe("MenuDropdown", () => {
  describe("rendering", () => {
    it("renders all normal items when visible", () => {
      const wrapper = mountDropdown();
      const itemEls = wrapper.findAll('[data-menu-item]');
      expect(itemEls).toHaveLength(3);
    });

    it("renders item labels", () => {
      const wrapper = mountDropdown();
      const text = wrapper.text();
      expect(text).toContain("Open Folder");
      expect(text).toContain("Save");
      expect(text).toContain("Exit");
    });

    it("renders shortcuts", () => {
      const wrapper = mountDropdown();
      const text = wrapper.text();
      expect(text).toContain("Ctrl+K Ctrl+O");
      expect(text).toContain("Ctrl+S");
    });

    it("renders separators", () => {
      const wrapper = mountDropdown();
      const separators = wrapper.findAll('[data-menu-separator]');
      expect(separators).toHaveLength(1);
    });

    it("does not render content when not visible", () => {
      const wrapper = mount(MenuDropdown, {
        props: { items: sampleItems, visible: false },
      });
      expect(wrapper.find('[data-menu-dropdown]').exists()).toBe(false);
    });
  });

  describe("interaction", () => {
    it("emits select with item data when clicked", async () => {
      const wrapper = mountDropdown();
      const firstItem = wrapper.find('[data-menu-item="save"]');
      await firstItem.trigger("click");

      expect(wrapper.emitted("select")).toHaveLength(1);
      expect(wrapper.emitted("select")![0][0]).toEqual(sampleItems[1]);
    });

    it("emits close when clicking outside", async () => {
      const wrapper = mountDropdown();
      await document.body.click();

      expect(wrapper.emitted("close")).toHaveLength(1);
    });

    it("emits close when Escape is pressed", async () => {
      const wrapper = mountDropdown();
      await wrapper.trigger("keydown", { key: "Escape" });

      expect(wrapper.emitted("close")).toHaveLength(1);
    });

    it("does not emit select for separator items", async () => {
      const wrapper = mountDropdown();
      const separator = wrapper.find('[data-menu-separator]');
      await separator.trigger("click");

      expect(wrapper.emitted("select")).toBeFalsy();
    });

    it("does not emit select for disabled items", async () => {
      const items: MenuItem[] = [
        { id: "enabled", label: "Enabled" },
        { id: "disabled", label: "Disabled", disabled: true },
      ];
      const wrapper = mountDropdown(items);
      const disabledItem = wrapper.find('[data-menu-item="disabled"]');
      await disabledItem.trigger("click");

      expect(wrapper.emitted("select")).toBeFalsy();
    });
  });
});
