import test from "japa";
import { createStore } from "redux";
import { spy } from "sinon";

// simplistic reducer for our demo
function counter(state = 0, { type, payload }) {
  switch (type) {
    case "TEST":
      return state + payload;
    default:
      return state;
  }
}

// we'll wedge this in to prove the unsubscribe works
const sanityCheck = spy();

/**
 * The simplest of observations would be a waiting period
 * determined by the pending promise. A sucess condition
 * determined by the .then and a failure condition determined
 * by the .catch.
 */
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

// helper function to free up the event loop
const sleep = ms => new Promise(res => setTimeout(res, ms));

test.group("simple observation", group => {
  let store, resolve, reject;

  group.beforeEach(() => {
    resolve = spy();
    reject = spy();
    sanityCheck.resetHistory();

    store = createStore(counter);

    // set to the loading state then call our function
    simpleObservation(store)
      .then(resolve) // handle the sucess case
      .catch(reject); // handle the failure case
  });

  test("should resolve if count === 3", async assert => {
    store.dispatch({ type: "TEST", payload: 3 });

    // release the kraken
    await sleep();

    assert.equal(resolve.called, true);
    assert.equal(sanityCheck.callCount, 1);

    // Ensure we are unsubscribed from changes
    store.dispatch({ type: "TEST", payload: 4 });
    assert.equal(sanityCheck.callCount, 1);
  });

  test("should reject if count < 0", async assert => {
    store.dispatch({ type: "TEST", payload: -1 });

    // release the kraken
    await sleep();

    assert.equal(reject.called, true);
    assert.equal(sanityCheck.callCount, 1);

    // Ensure we are unsubscribed from changes
    store.dispatch({ type: "TEST", payload: 1 });
    assert.equal(sanityCheck.callCount, 1);
  });
});
