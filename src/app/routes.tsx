import React from "react";
import { createBrowserRouter } from "react-router";
import { Root } from "./pages/Root";
import { Home } from "./pages/Home";
import { PlantDetail } from "./pages/PlantDetail";
import { KnowledgeGraph } from "./pages/KnowledgeGraph";
import { Chat } from "./pages/Chat";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "plant/:id", Component: PlantDetail },
      { path: "graph", Component: KnowledgeGraph },
      { path: "chat", Component: Chat },
    ],
  },
]);
