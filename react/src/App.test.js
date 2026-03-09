import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeAll, jest } from "@jest/globals";

jest.mock("axios", () => ({
  get: () => Promise.resolve({ data: [] }),
  post: () => Promise.resolve({ data: {} }),
  put: () => Promise.resolve({ data: {} }),
  delete: () => Promise.resolve({ data: {} }),
  create: () => ({
    get: () => Promise.resolve({ data: [] }),
    post: () => Promise.resolve({ data: {} }),
    put: () => Promise.resolve({ data: {} }),
    delete: () => Promise.resolve({ data: {} }),
  }),
}));

import App from "./App";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

test("renders login page", async () => {
  window.history.pushState({}, "Login page", "/login");
  render(<App />);
  expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
});

test("redirects unauthenticated users away from admin email list", async () => {
  window.history.pushState({}, "All emails page", "/all");
  render(<App />);
  expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
});
