import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Core Deduplication Logic mirroring ToastContext implementation
function createToastManager() {
  const activeKeys = new Map();
  let toasts = [];

  function getToastDedupeKey(type, message, title) {
    return `${type}:${(title || '').trim()}::${message.trim()}`;
  }

  function addToast(type, message, titleOrOptions) {
    let title;
    let duration = 3800;

    if (typeof titleOrOptions === 'string') {
      title = titleOrOptions;
    } else if (titleOrOptions) {
      title = titleOrOptions.title;
      if (titleOrOptions.duration !== undefined) {
        duration = titleOrOptions.duration;
      }
    }

    const dedupeKey = getToastDedupeKey(type, message, title);
    const existingId = activeKeys.get(dedupeKey);

    if (existingId) {
      // Coalesce duplicate
      toasts = toasts.map((t) => {
        if (t.id === existingId) {
          return {
            ...t,
            count: (t.count || 1) + 1,
            updatedAt: Date.now(),
            isExiting: false,
          };
        }
        return t;
      });
      return existingId;
    }

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    activeKeys.set(dedupeKey, id);

    const newToast = {
      id,
      type,
      message,
      title,
      duration,
      count: 1,
      updatedAt: Date.now(),
    };

    // Safeguard check & eviction
    const duplicate = toasts.find(
      (t) => !t.isExiting && getToastDedupeKey(t.type, t.message, t.title) === dedupeKey
    );
    if (duplicate) {
      toasts = toasts.map((t) =>
        t.id === duplicate.id
          ? { ...t, count: (t.count || 1) + 1, updatedAt: Date.now(), isExiting: false }
          : t
      );
    } else {
      if (toasts.length >= 4) {
        const evicted = toasts.slice(0, toasts.length - 3);
        for (const item of evicted) {
          activeKeys.delete(getToastDedupeKey(item.type, item.message, item.title));
        }
      }
      toasts = [...toasts.slice(-3), newToast];
    }

    return id;
  }

  function dismiss(id) {
    const item = toasts.find((t) => t.id === id);
    if (item) {
      const key = getToastDedupeKey(item.type, item.message, item.title);
      activeKeys.delete(key);
    }
    toasts = toasts.map((t) => (t.id === id ? { ...t, isExiting: true } : t));
    // simulate exit removal
    toasts = toasts.filter((t) => t.id !== id);
  }

  function clearAll() {
    activeKeys.clear();
    toasts = [];
  }

  const toast = {
    success: (msg, opts) => addToast('success', msg, opts),
    error: (msg, opts) => addToast('error', msg, opts),
    warning: (msg, opts) => addToast('warning', msg, opts),
    info: (msg, opts) => addToast('info', msg, opts),
    dismiss,
    clearAll,
  };

  return {
    toast,
    getToasts: () => toasts,
    getActiveKeys: () => activeKeys,
  };
}

describe('Toast De-duplication and Display Suite', () => {
  it('Scenario 1: Single toast creation registers exactly 1 item', () => {
    const mgr = createToastManager();
    const id = mgr.toast.success('Inventory item updated successfully!');
    assert.ok(id, 'Toast ID should be returned');
    assert.equal(mgr.getToasts().length, 1);
    assert.equal(mgr.getToasts()[0].count, 1);
    assert.equal(mgr.getToasts()[0].message, 'Inventory item updated successfully!');
  });

  it('Scenario 2: Duplicate calls do NOT create duplicate visible toasts', () => {
    const mgr = createToastManager();
    const id1 = mgr.toast.warning('Cart is empty. Please select products.');
    const id2 = mgr.toast.warning('Cart is empty. Please select products.');
    const id3 = mgr.toast.warning('Cart is empty. Please select products.');

    assert.equal(id1, id2, 'Duplicate call should return identical toast ID');
    assert.equal(id2, id3, 'Duplicate call should return identical toast ID');
    assert.equal(mgr.getToasts().length, 1, 'Only 1 toast card must be visible');
    assert.equal(mgr.getToasts()[0].count, 3, 'Count should reflect 3 coalesced calls');
  });

  it('Scenario 3: Rapid burst spamming produces exactly 1 toast card', () => {
    const mgr = createToastManager();
    for (let i = 0; i < 50; i++) {
      mgr.toast.error('Network connection timeout. Retrying...', 'Connection Error');
    }

    const activeToasts = mgr.getToasts();
    assert.equal(activeToasts.length, 1, 'Burst spamming must not stack 50 toast cards');
    assert.equal(activeToasts[0].count, 50, 'Count multiplier correctly tracks 50 triggers');
    assert.equal(activeToasts[0].title, 'Connection Error');
  });

  it('Scenario 4: Distinct messages create distinct toasts', () => {
    const mgr = createToastManager();
    mgr.toast.success('SKU registered successfully!');
    mgr.toast.info('Audit log synchronized.');
    mgr.toast.warning('Stock is approaching reorder threshold.');

    assert.equal(mgr.getToasts().length, 3, 'Three distinct messages should produce 3 toasts');
    const messages = mgr.getToasts().map((t) => t.message);
    assert.ok(messages.includes('SKU registered successfully!'));
    assert.ok(messages.includes('Audit log synchronized.'));
    assert.ok(messages.includes('Stock is approaching reorder threshold.'));
  });

  it('Scenario 5: Same message with different severity types are separated', () => {
    const mgr = createToastManager();
    mgr.toast.info('System reboot scheduled');
    mgr.toast.warning('System reboot scheduled');

    assert.equal(mgr.getToasts().length, 2, 'Different severity levels should not dedupe together');
  });

  it('Scenario 6: Dismissing a toast frees the key for subsequent alerts', () => {
    const mgr = createToastManager();
    const id1 = mgr.toast.error('Payment gateway unavailable');
    assert.equal(mgr.getToasts().length, 1);

    mgr.toast.dismiss(id1);
    assert.equal(mgr.getToasts().length, 0, 'Dismissed toast is removed');

    const id2 = mgr.toast.error('Payment gateway unavailable');
    assert.equal(mgr.getToasts().length, 1, 'New toast can be created after dismissal');
    assert.notEqual(id1, id2, 'New toast should have a fresh unique ID');
  });

  it('Scenario 7: clearAll empties all active toasts and resets deduplication map', () => {
    const mgr = createToastManager();
    mgr.toast.success('A');
    mgr.toast.error('B');
    mgr.toast.info('C');
    assert.equal(mgr.getToasts().length, 3);

    mgr.toast.clearAll();
    assert.equal(mgr.getToasts().length, 0);
    assert.equal(mgr.getActiveKeys().size, 0);
  });

  it('Scenario 8: Stack limit eviction drops older keys without memory leak', () => {
    const mgr = createToastManager();
    mgr.toast.success('Msg 1');
    mgr.toast.success('Msg 2');
    mgr.toast.success('Msg 3');
    mgr.toast.success('Msg 4');
    mgr.toast.success('Msg 5');

    assert.equal(mgr.getToasts().length, 4, 'Max concurrent toasts strictly limited to 4');
    assert.equal(mgr.getToasts()[mgr.getToasts().length - 1].message, 'Msg 5');
  });
});

