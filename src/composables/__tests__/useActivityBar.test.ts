import { describe, it, expect, beforeEach } from "vitest";
import { useActivityBar } from "../useActivityBar";

describe("useActivityBar", () => {
  beforeEach(() => {
    const { setActivity } = useActivityBar();
    setActivity("files");
  });

  it("defaults activeActivity to 'files'", () => {
    const { activeActivity } = useActivityBar();
    expect(activeActivity.value).toBe("files");
  });

  it("setActivity switches to another activity", () => {
    const { activeActivity, setActivity } = useActivityBar();
    setActivity("search");
    expect(activeActivity.value).toBe("search");
  });

  it("setActivity ignores unknown activity IDs", () => {
    const { activeActivity, setActivity } = useActivityBar();
    setActivity("unknown");
    expect(activeActivity.value).toBe("files");
  });

  it("returns the list of available activities", () => {
    const { activities } = useActivityBar();
    expect(activities.length).toBeGreaterThanOrEqual(2);
    expect(activities.find((a) => a.id === "files")).toBeTruthy();
    expect(activities.find((a) => a.id === "search")).toBeTruthy();
  });

  it("each activity has id, label, and icon", () => {
    const { activities } = useActivityBar();
    for (const a of activities) {
      expect(a).toHaveProperty("id");
      expect(a).toHaveProperty("label");
      expect(a).toHaveProperty("icon");
    }
  });
});
