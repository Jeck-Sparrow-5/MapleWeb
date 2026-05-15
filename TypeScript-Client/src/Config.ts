interface Config {
  height: number;
  width: number;
  originalHeight: number;
  originalWidth: number;
  bottomSafeGap: number;
  websocketUrl?: string;
}

const originalHeight: number = 600;
const originalWidth: number = 800;

const config: Config = {
  height: 720, // need to be changed also in index.html canvas tag
  width: 1280, // need to be changed also in index.html canvas tag
  originalHeight,
  originalWidth,
  bottomSafeGap: 0, // 800x600
  websocketUrl: import.meta.env.VITE_WEBSOCKET_URL,
};

const element: HTMLElement = document.documentElement; // Get the root element (whole document)

export function enterBrowserFullscreen(): void {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  }
}

const goFullScreen = (): void => {
  const h = window.innerHeight;
  const w = window.innerWidth;

  // Ignore calls before the window has real dimensions
  if (h < 100 || w < 100) return;

  config.height = h;
  config.width = w;
  config.bottomSafeGap = h - config.originalHeight;

  const gameCanvasElement = document.getElementById("game") as HTMLCanvasElement | null;
  if (gameCanvasElement) {
    gameCanvasElement.height = h;
    gameCanvasElement.width = w;
  }
};

window.addEventListener("resize", goFullScreen);

// Defer until layout is complete — window.innerHeight may be 0/tiny on first script eval
requestAnimationFrame(() => goFullScreen());

console.log("Config: ", config);

export default config;
