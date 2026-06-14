import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ActivityBar from "../ActivityBar.vue";
import { useActivityBar } from "../../../composables/useActivityBar";

describe("ActivityBar", () => {
  beforeEach(() => {
    const { setActivity } = useActivityBar();
    setActivity("files");
  });

  it("renders a button for each activity", () => {
    const wrapper = mount(ActivityBar);
    const buttons = wrapper.findAll('[data-activity-btn]');
    expect(buttons.length).toBe(2);
  });

  it("renders the correct icons", () => {
    const wrapper = mount(ActivityBar);
    const buttons = wrapper.findAll('[data-activity-btn]');
    expect(buttons[0].find(".codicon-files").exists()).toBe(true);
    expect(buttons[1].find(".codicon-search").exists()).toBe(true);
  });

  it("highlights the active activity button", async () => {
    const wrapper = mount(ActivityBar);
    let buttons = wrapper.findAll('[data-activity-btn]');
    expect(buttons[0].classes()).toContain("active");

    await buttons[1].trigger("click");
    buttons = wrapper.findAll('[data-activity-btn]');
    expect(buttons[0].classes()).not.toContain("active");
    expect(buttons[1].classes()).toContain("active");
  });

  it("switches active activity on click", async () => {
    const wrapper = mount(ActivityBar);
    const buttons = wrapper.findAll('[data-activity-btn]');

    await buttons[1].trigger("click");
    const { activeActivity } = useActivityBar();
    expect(activeActivity.value).toBe("search");
  });

  it("each button has a title attribute for tooltip", () => {
    const wrapper = mount(ActivityBar);
    const buttons = wrapper.findAll('[data-activity-btn]');
    buttons.forEach((btn) => {
      expect(btn.attributes("title")).toBeTruthy();
    });
  });
});
