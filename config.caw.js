import {
  ADDON_CATEGORY,
  ADDON_TYPE,
  PLUGIN_TYPE,
  PROPERTY_TYPE,
} from "./template/enums.js";
import _version from "./version.js";
export const addonType = ADDON_TYPE.BEHAVIOR;
export const type = PLUGIN_TYPE.OBJECT;
export const id = "salmanshh_lumencast";
export const name = "LumenCast";
export const version = _version;
export const minConstructVersion = undefined;
export const author = "SalmanShh";
export const website = "https://www.construct.net";
export const documentation = "https://www.construct.net";
export const description =
  "Mesh-driven line of sight and dynamic lighting for world objects.";
export const category = ADDON_CATEGORY.GENERAL;

export const hasDomside = false;
export const files = {
  extensionScript: {
    enabled: false, // set to false to disable the extension script
    watch: true, // set to true to enable live reload on changes during development
    targets: ["x86", "x64"],
    // you don't need to change this, the build step will rename the dll for you. Only change this if you change the name of the dll exported by Visual Studio
    name: "MyExtension",
  },
  fileDependencies: [],
  remoteFileDependencies: [
    // {
    //   src: "https://example.com/api.js", // Must use https:// or same-protocol // URLs. http:// is not allowed.
    //   type: "" // Optional: "" or "module". Empty string or omit for classic script.
    // }
  ],
  cordovaPluginReferences: [],
  cordovaResourceFiles: [],
};

// categories that are not filled will use the folder name
export const aceCategories = {
  Setup: "Setup",
  Mesh: "Mesh",
  Detection: "Detection",
  Batcher: "Batcher",
  Visibility: "Visibility",
  State: "State",
};

export const info = {
  // icon: "icon.svg",
  // PLUGIN world only
  // defaultImageUrl: "default-image.png",
  Set: {
    // COMMON to all
    CanBeBundled: true,
    IsDeprecated: false,
    GooglePlayServicesEnabled: false,

    // BEHAVIOR only
    IsOnlyOneAllowed: false,

    // PLUGIN world only
    IsResizable: false,
    IsRotatable: false,
    Is3D: false,
    HasImage: false,
    IsTiled: false,
    SupportsZElevation: false,
    SupportsColor: false,
    SupportsEffects: false,
    MustPreDraw: false,

    // PLUGIN object only
    IsSingleGlobal: false,
  },
  // PLUGIN only
  AddCommonACEs: {
    Position: false,
    SceneGraph: false,
    Size: false,
    Angle: false,
    Appearance: false,
    ZOrder: false,
  },
};

export const properties = [
  {
    type: PROPERTY_TYPE.CHECK,
    id: "batcherHandshake",
    options: {
      initialValue: true,
    },
    name: "Batcher handshake",
    desc: "Allow LumenBatch to claim this light for batched rendering.",
  },
  {
    type: PROPERTY_TYPE.COMBO,
    id: "obstacleMode",
    options: {
      initialValue: "solid_behaviour",
      items: [
        { solid_behaviour: "Solid behaviour" },
        { custom_objects: "Custom objects" },
        { tag: "Tag" },
      ],
    },
    name: "Obstacle mode",
    desc: "How obstacle candidates are collected each tick.",
  },
  {
    type: PROPERTY_TYPE.OBJECT,
    id: "obstacleObjects",
    options: {
      allowedPluginIds: ["<world>"],
    },
    name: "Obstacle object",
    desc: "Seed obstacle object type for custom object mode.",
  },
  {
    type: PROPERTY_TYPE.TEXT,
    id: "obstacleTag",
    options: {
      initialValue: "wall",
    },
    name: "Obstacle tag",
    desc: "Primary instance tag used in tag obstacle mode.",
  },
  {
    type: PROPERTY_TYPE.TEXT,
    id: "detectionTag",
    options: {
      initialValue: "",
    },
    name: "Detection tag",
    desc: "Instance tag used for enter and exit detection events.",
  },
  {
    type: PROPERTY_TYPE.FLOAT,
    id: "lightRadius",
    options: {
      initialValue: 300,
      minValue: 0,
    },
    name: "Light radius",
    desc: "Maximum ray distance in world pixels.",
  },
  {
    type: PROPERTY_TYPE.FLOAT,
    id: "rayArc",
    options: {
      initialValue: 360,
      minValue: 1,
      maxValue: 360,
    },
    name: "Ray arc",
    desc: "Angular sweep in degrees centered on the facing direction.",
  },
  {
    type: PROPERTY_TYPE.INTEGER,
    id: "rayCount",
    options: {
      initialValue: 64,
      minValue: 8,
    },
    name: "Ray count",
    desc: "Number of primary rays cast per update.",
  },
  {
    type: PROPERTY_TYPE.FLOAT,
    id: "facingAngle",
    options: {
      initialValue: 0,
    },
    name: "Facing angle",
    desc: "Angle offset added to the host object's angle.",
  },
  {
    type: PROPERTY_TYPE.CHECK,
    id: "meshDeformEnabled",
    options: {
      initialValue: true,
    },
    name: "Mesh deform enabled",
    desc: "Write the visibility polygon to the host object's mesh each tick.",
  },
  {
    type: PROPERTY_TYPE.FLOAT,
    id: "detectionInterval",
    options: {
      initialValue: 0,
      minValue: 0,
    },
    name: "Detection interval",
    desc: "Seconds between detection sweeps. Zero means every tick.",
  },
  {
    type: PROPERTY_TYPE.COMBO,
    id: "cullMode",
    options: {
      initialValue: "radius_aabb",
      items: [{ radius_aabb: "Radius AABB" }, { none: "None" }],
    },
    name: "Cull mode",
    desc: "Broadphase culling mode before raycasting.",
  },
  {
    type: PROPERTY_TYPE.CHECK,
    id: "debugOverlay",
    options: {
      initialValue: false,
    },
    name: "Debug overlay",
    desc: "Draw debugger information in preview builds when available.",
  },
];
