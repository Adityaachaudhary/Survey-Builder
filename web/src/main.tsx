import { RouterProvider, createRouter } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultNotFoundComponent: () => (
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="text-center">
				<p className="text-6xl font-bold text-muted-foreground/20 mb-3">404</p>
				<h1 className="text-xl font-bold mb-2">Page not found</h1>
				<a href="/" className="text-sm text-primary hover:underline">
					Go home
				</a>
			</div>
		</div>
	),
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const root = document.getElementById("root");
if (!root) throw new Error("No root element found");

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>,
);
