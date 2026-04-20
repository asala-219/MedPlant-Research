import React from "react";
import { createBrowserRouter } from "react-router";
import { Root } from "./pages/Root";
import { Home } from "./pages/Home";
import { PlantDetail } from "./pages/PlantDetail";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { 
        index: true, 
        Component: Home 
      },
      { 
        path: "plant/:id", 
        Component: PlantDetail 
      }
    ],
  },
]);