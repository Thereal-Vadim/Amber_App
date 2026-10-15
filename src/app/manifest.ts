import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amber — команда в одном ритме",
    short_name: "Amber",
    description: "Координация event-команды в реальном времени",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#ff6b00",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
