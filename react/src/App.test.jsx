import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the login screen when signed out", async () => {
  render(<App />);
  expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
});
