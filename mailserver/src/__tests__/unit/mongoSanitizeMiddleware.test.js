const mongoSanitize = require("../../middleware/mongoSanitizeMiddleware");

const run = (req, options) => {
  const next = jest.fn();
  mongoSanitize(options)({ headers: {}, ...req }, {}, next);
  return next;
};

describe("mongoSanitize middleware", () => {
  test("strips operator keys from nested body values", () => {
    const req = { body: { username: "a", password: { $ne: null } } };
    run(req);
    expect(req.body.password).toEqual({});
    expect(req.body.username).toBe("a");
  });

  test("drops top-level operator and dotted keys, keeps clean ones", () => {
    const req = { body: { $where: "1==1", "a.b": 1, ok: 2 } };
    run(req);
    expect(req.body).toEqual({ ok: 2 });
  });

  test("recurses into arrays", () => {
    const req = { body: { list: [{ $gt: 1 }, { keep: 2 }] } };
    run(req);
    expect(req.body.list).toEqual([{}, { keep: 2 }]);
  });

  test("drops prototype-pollution keys and does not pollute Object.prototype", () => {
    const req = { body: JSON.parse('{"__proto__":{"polluted":true},"ok":1}') };
    run(req);
    expect(req.body).toEqual({ ok: 1 });
    expect({}.polluted).toBeUndefined();
  });

  test("replaceWith strips EVERY offending character, not just the first", () => {
    const req = { body: { "$g$t": 1 } };
    run(req, { replaceWith: "_" });
    expect(Object.keys(req.body)).toEqual(["_g_t"]);
  });

  test("mutates req.body in place (reference preserved)", () => {
    const body = { $gt: 1, ok: 2 };
    const req = { body };
    run(req);
    expect(req.body).toBe(body);
  });

  test("params are sanitized too", () => {
    const req = { body: {}, params: { $ne: "x", emailId: "a@b.c" } };
    run(req);
    expect(req.params).toEqual({ emailId: "a@b.c" });
  });

  test("onSanitize fires only when something was removed", () => {
    const dirtySpy = jest.fn();
    run({ body: { $gt: 1 } }, { onSanitize: dirtySpy });
    expect(dirtySpy).toHaveBeenCalledTimes(1);

    const cleanSpy = jest.fn();
    run({ body: { ok: 1 } }, { onSanitize: cleanSpy });
    expect(cleanSpy).not.toHaveBeenCalled();
  });

  test("next() is always called once", () => {
    const next = run({ body: { ok: 1 } });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
