interface Config {
  height: number;
  width: number;
  originalHeight: number;
  originalWidth: number;
  bottomSafeGap: number;
}

const originalHeight: number = 600;
const originalWidth: number = 800;

const config: Config = {
  height: 720, // need to be changed also in index.html canvas tag
  width: 1280, // need to be changed also in index.html canvas tag
  originalHeight,
  originalWidth,
  bottomSafeGap: 0, // 800x600
};

const element: HTMLElement = document.documentElement; // Get the root element (whole document)

export function enterBrowserFullscreen(): void {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  }
}

const goFullScreen = (): void => {
  // this requires user interaction
  // enterBrowserFullscreen();
  config.height = window.innerHeight;
  config.width = window.innerWidth;
  config.bottomSafeGap = config.height - config.originalHeight;

  const gameCanvasElement = document.getElementById(
    "game"
  ) as HTMLCanvasElement | null;

  if (gameCanvasElement) {
    gameCanvasElement.height = config.height;
    gameCanvasElement.width = config.width;
  }
};

// this not working dynamically yet
window.addEventListener("resize", goFullScreen);

goFullScreen();

console.log("Config: ", config);

export default config;
