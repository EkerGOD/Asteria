import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Toolbar from "../Toolbar.vue";
import MenuDropdown from "../MenuDropdown.vue";

describe("Toolbar", () => {
  describe("menu buttons", () => {
    it("renders File, Edit, View, Help buttons", () => {
      const wrapper = mount(Toolbar);
      const buttons = wrapper.findAll('[data-menu-button]');
      const labels = buttons.map((b) => b.text());
      expect(labels).toContain("File");
      expect(labels).toContain("Edit");
      expect(labels).toContain("View");
      expect(labels).toContain("Help");
      expect(buttons).toHaveLength(4);
    });

    it("opens dropdown when a menu button is clicked", async () => {
      const wrapper = mount(Toolbar);
      const fileBtn = wrapper.find('[data-menu-button="file"]');

      expect(wrapper.findComponent(MenuDropdown).exists()).toBe(false);

      await fileBtn.trigger("click");
      expect(wrapper.findComponent(MenuDropdown).exists()).toBe(true);
    });

    it("closes dropdown when same button is clicked again", async () => {
      const wrapper = mount(Toolbar);
      const fileBtn = wrapper.find('[data-menu-button="file"]');

      await fileBtn.trigger("click");
      expect(wrapper.findComponent(MenuDropdown).exists()).toBe(true);

      await fileBtn.trigger("click");
      expect(wrapper.findComponent(MenuDropdown).exists()).toBe(false);
    });

    it("switches dropdown when different button is clicked", async () => {
      const wrapper = mount(Toolbar);
      const fileBtn = wrapper.find('[data-menu-button="file"]');
      const editBtn = wrapper.find('[data-menu-button="edit"]');

      await fileBtn.trigger("click");
      expect(wrapper.findComponent(MenuDropdown).props("items")[0].label).toBe(
        "Open Folder"
      );

      await editBtn.trigger("click");
      expect(wrapper.findComponent(MenuDropdown).props("items")[0].label).toBe(
        "Undo"
      );
    });

    it("closes dropdown when MenuDropdown emits close", async () => {
      const wrapper = mount(Toolbar);
      const fileBtn = wrapper.find('[data-menu-button="file"]');

      await fileBtn.trigger("click");
      expect(wrapper.findComponent(MenuDropdown).exists()).toBe(true);

      await wrapper.findComponent(MenuDropdown).vm.$emit("close");
      expect(wrapper.findComponent(MenuDropdown).exists()).toBe(false);
    });

    it("closes dropdown when MenuDropdown emits select", async () => {
      const wrapper = mount(Toolbar);
      const fileBtn = wrapper.find('[data-menu-button="file"]');

      await fileBtn.trigger("click");
      expect(wrapper.findComponent(MenuDropdown).exists()).toBe(true);

      await wrapper
        .findComponent(MenuDropdown)
        .vm.$emit("select", { id: "save", label: "Save" });
      expect(wrapper.findComponent(MenuDropdown).exists()).toBe(false);
    });
  });

  describe("collapse button", () => {
    it("renders collapse button on the right side", () => {
      const wrapper = mount(Toolbar);
      const btn = wrapper.find('[data-collapse-btn]');
      expect(btn.exists()).toBe(true);
    });
  });
});
