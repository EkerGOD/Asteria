import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import SearchPanel from "../SearchPanel.vue";
import { useFileManager } from "../../../composables/useFileManager";

let listeners = new Map<string, (event: unknown) => void>();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((event: string, handler: (event: unknown) => void) => {
    listeners.set(event, handler);
    return Promise.resolve(() => {
      listeners.delete(event);
    });
  }),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  ask: vi.fn(() => Promise.resolve(true)),
}));

function emitEvent(event: string, payload: unknown) {
  const handler = listeners.get(event);
  if (handler) handler({ payload });
}

describe("SearchPanel", () => {
  beforeEach(() => {
    const { currentFolder } = useFileManager();
    currentFolder.value = "/test/dir";
    listeners.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search input", () => {
    const wrapper = mount(SearchPanel);
    const input = wrapper.find('[data-search-input]');
    expect(input.exists()).toBe(true);
    expect(input.attributes("placeholder")).toBeTruthy();
  });

  it("hides replace input by default", () => {
    const wrapper = mount(SearchPanel);
    const replaceInput = wrapper.find('[data-replace-input]');
    expect(replaceInput.exists()).toBe(false);
  });

  it("toggles replace input visibility", async () => {
    const wrapper = mount(SearchPanel);
    const toggleBtn = wrapper.find('[data-replace-toggle]');

    await toggleBtn.trigger("click");
    expect(wrapper.find('[data-replace-input]').exists()).toBe(true);

    await toggleBtn.trigger("click");
    expect(wrapper.find('[data-replace-input]').exists()).toBe(false);
  });

  it("renders search option toggles", () => {
    const wrapper = mount(SearchPanel);
    expect(wrapper.find('[data-toggle-case]').exists()).toBe(true);
    expect(wrapper.find('[data-toggle-word]').exists()).toBe(true);
    expect(wrapper.find('[data-toggle-regex]').exists()).toBe(true);
  });

  it("shows placeholder when no folder is open", () => {
    const { currentFolder } = useFileManager();
    currentFolder.value = "";
    const wrapper = mount(SearchPanel);
    expect(wrapper.text()).toContain("Open a folder");
  });

  it("does not show placeholder when folder is open", () => {
    const wrapper = mount(SearchPanel);
    expect(wrapper.text()).not.toContain("Open a folder");
  });

  it("shows spinner while searching", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValueOnce(undefined); // cancel_search resolves immediately
    vi.mocked(invoke).mockReturnValueOnce(new Promise(() => {})); // search_in_dir_cmd hangs

    const wrapper = mount(SearchPanel);
    await wrapper.find('[data-search-input]').setValue("hello");
    vi.advanceTimersByTime(300);
    await flushPromises();

    expect(wrapper.find('.search-spinner').exists()).toBe(true);
  });

  it("hides spinner when search completes", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(undefined);

    const wrapper = mount(SearchPanel);
    await wrapper.find('[data-search-input]').setValue("hello");
    vi.advanceTimersByTime(300);
    await flushPromises();

    emitEvent("search-done", { total_matches: 0 });
    await flushPromises();

    expect(wrapper.find('.search-spinner').exists()).toBe(false);
  });

  it("displays search results via streaming events", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(undefined);

    const wrapper = mount(SearchPanel);
    await wrapper.find('[data-search-input]').setValue("hello");
    vi.advanceTimersByTime(300);
    await flushPromises();

    emitEvent("search-result", {
      file: "test.md",
      lines: [
        { line_num: 1, content: "hello world", match_start: 0, match_end: 5 },
      ],
    });
    vi.advanceTimersByTime(16);
    await flushPromises();

    expect(wrapper.find('[data-result-file]').exists()).toBe(true);
    expect(wrapper.text()).toContain("test.md");
    expect(wrapper.text()).toContain("hello world");
  });

  it("calls replace on single file when replace button is clicked", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(undefined);

    const wrapper = mount(SearchPanel);
    await wrapper.find('[data-search-input]').setValue("hello");
    vi.advanceTimersByTime(300);
    await flushPromises();

    emitEvent("search-result", {
      file: "test.md",
      lines: [
        { line_num: 1, content: "hello", match_start: 0, match_end: 5 },
      ],
    });
    vi.advanceTimersByTime(16);
    await flushPromises();

    emitEvent("search-done", { total_matches: 1 });
    await flushPromises();

    await wrapper.find('[data-replace-toggle]').trigger("click");
    await wrapper.find('[data-replace-input]').setValue("hi");

    vi.mocked(invoke).mockResolvedValue(undefined);
    await wrapper.find('[data-replace-all-btn]').trigger("click");
    await flushPromises();

    expect(invoke).toHaveBeenCalledWith("replace_in_file_cmd", expect.any(Object));
  });
});
