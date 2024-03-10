import WZNode from "./WZNode";

/**
 * WZManager handles the loading and caching of WZ files.
 */
interface WZManager {
  cache: WZNode;
  initialize: () => void;
  load: (filename: string) => Promise<void>;
  pathExists: (thePath: string) => boolean;
  get: (thePath: string) => Promise<WZNode | undefined>;
}

const WZManager: WZManager = {
  /**
   * The cache to store loaded WZNode objects.
   */
  cache: new WZNode({ $dir: "" }),

  /**
   * Initializes the WZManager by setting up the cache.
   */
  initialize() {
    this.cache = new WZNode({ $dir: "" });
  },

  /**
   * Loads and caches a WZ file.
   *
   * @param filename - Relative path to WZ file.
   * @example WZManager.load('Map.wz/Map/Map1/100000000.img');
   * @example WZManager.load('Character.wz/Cap/01002357.img');
   */
  async load(filename) {
    const json = await fetch(`wz_client/${filename}.json`).then((res) =>
      res.json()
    );

    let tree: any = this.cache;
    filename
      .split("/")
      .slice(0, -1)
      .forEach((p) => {
        if (!(p in tree)) {
          tree[p] = new WZNode({ $dir: p }, tree);
          tree.nChildren.push(tree[p]);
        }
        tree = tree[p];
      });

    const subtree = new WZNode(json, tree);
    tree[subtree.nName] = subtree;
    tree.nChildren.push(subtree);
  },

  /**
   * Checks if a WZ path exists in the cache.
   *
   * @param thePath - WZ path.
   * @returns True if path exists, false otherwise.
   */
  pathExists(thePath) {
    let tree: any = this.cache;
    for (const p of thePath.split("/")) {
      if (tree === undefined || tree[p] === undefined) {
        return false;
      }
      tree = tree[p];
    }
    return true;
  },

  /**
   * Gets a WZNode from the cache based on the provided path.
   * If the path doesn't exist, it loads the corresponding WZ file.
   *
   * @param thePath - WZ path.
   * @returns The WZNode if found, undefined otherwise.
   */
  async get(thePath) {
    if (!this.pathExists(thePath)) {
      const filename = `${thePath.split(".img")[0]}.img`;
      await this.load(filename);
    }
    let tree: any = this.cache;
    for (const p of thePath.split("/")) {
      tree = tree[p];
    }
    return tree;
  },
};

export default WZManager;
