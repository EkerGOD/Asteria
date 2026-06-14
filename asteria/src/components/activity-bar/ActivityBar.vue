<template>
  <div class="activity-bar">
    <button
      v-for="activity in activities"
      :key="activity.id"
      :data-activity-btn="activity.id"
      :title="activity.label"
      :class="['activity-btn', { active: activeActivity === activity.id }]"
      @click="setActivity(activity.id)"
    >
      <span class="codicon" :class="activity.icon" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useActivityBar } from "../../composables/useActivityBar";

const { activities, activeActivity, setActivity } = useActivityBar();
</script>

<style scoped>
.activity-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 48px;
  flex-shrink: 0;
  background: var(--bg-tertiary, #f0f0f0);
  border-right: 1px solid var(--border-primary, #e0e0e0);
  padding-top: 4px;
  gap: 2px;
}

.activity-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  background: transparent;
  color: var(--text-muted, #888);
  cursor: pointer;
  font-size: 20px;
  position: relative;
}

.activity-btn:hover {
  color: var(--text-primary, #1a1a1a);
}

.activity-btn.active {
  color: var(--link-color, #0066cc);
}

.activity-btn.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--link-color, #0066cc);
  border-radius: 0 2px 2px 0;
}
</style>
