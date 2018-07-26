import test from "japa";
import { createStore } from "redux";
import { spy } from "sinon";

function counter(state = 0, { type, payload }) {
  switch (type) {
    case "TEST":
      return state + payload;
    default:
      return state;
  }
}

const sanityCheck = spy();

function simpleObservation({ getState, subscribe }) {
  return new Promise((res, rej) => {
    const unsubscribe = subscribe(() => {
      sanityCheck();
      const count = getState();
      if (count === 3) {
        unsubscribe();
        return res();
      }

      if (count < 0) {
        unsubscribe();
        return rej();
      }
    });
  });
}

const sleep = ms => new Promise(res => setTimeout(res, ms));

test.group("simple observation", group => {
  let store, resolve, reject;

  group.beforeEach(() => {
    resolve = spy();
    reject = spy();
    sanityCheck.resetHistory();

    store = createStore(counter);

    simpleObservation(store)
      .then(resolve)
      .catch(reject);
  });

  test("should resolve if count === 3", async assert => {
    store.dispatch({ type: "TEST", payload: 3 });

    await sleep();

    assert.equal(resolve.called, true);
    assert.equal(sanityCheck.callCount, 1);

    // Ensure we are unsubscribed from changes
    store.dispatch({ type: "TEST", payload: 4 });
    assert.equal(sanityCheck.callCount, 1);
  });

  test("should reject if count < 0", async assert => {
    store.dispatch({ type: "TEST", payload: -1 });

    await sleep();

    assert.equal(reject.called, true);
    assert.equal(sanityCheck.callCount, 1);

    // Ensure we are unsubscribed from changes
    store.dispatch({ type: "TEST", payload: 1 });
    assert.equal(sanityCheck.callCount, 1);
  });
});
