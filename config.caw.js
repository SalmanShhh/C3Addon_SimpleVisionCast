import {
  ADDON_CATEGORY,
  ADDON_TYPE,
  PLUGIN_TYPE,
  PROPERTY_TYPE,
} from "./template/enums.js";
import _version from "./version.js";
export const addonType = ADDON_TYPE.BEHAVIOR;
export const type = PLUGIN_TYPE.OBJECT;
export const id = "salmanshh_simplevisioncast";
export const name = "Simple Vision Cast";
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
    type: PROPERTY_TYPE.FLOAT,
    id: "range",
    options: {
      initialValue: 300,
      minValue: 0,
    },
    name: "Range",
    desc: "Maximum ray distance in pixels. Larger range = more expensive raycasting. Towers 500px, torches 250px, guards' eyes 300px. Adjust per use case and frame budget.",
  },
  {
    type: PROPERTY_TYPE.FLOAT,
    id: "cone",
    options: {
      initialValue: 360,
      minValue: 1,
      maxValue: 360,
    },
    name: "Cone",
    desc: "Angular sweep in degrees. 360 = omnidirectional light. 90 = narrow cone (stealth guards, headlights). Smaller cones are faster to render.",
  },
  {
    type: PROPERTY_TYPE.PERCENT,
    id: "rayDensity",
    options: {
      initialValue: 1.0,
    },
    name: "Ray density",
    desc: "Percentage of ray density. 100% = 1 ray per degree of cone angle. Higher density = smoother polygon but slower. 25% for many lights, 50% for balanced quality, 100% for precision lighting.",
  },
  {
    type: PROPERTY_TYPE.COMBO,
    id: "obstacleMode",
    options: {
      initialValue: "solid_behaviour",
      items: [
        { solid_behaviour: "Solid" },
        { custom_objects: "Custom objects" },
        { tag: "Tag" },
      ],
    },
    name: "Obstacle mode",
    desc: "How obstacles are identified. Solid: all objects with the Solid behavior block rays. Custom objects: only selected types block rays. Tag: only instances with a tag block rays. Use Tag mode for flexible, performant obstacle selection.",
  },
  {
    type: PROPERTY_TYPE.TEXT,
    id: "obstacleTag",
    options: {
      initialValue: "wall",
    },
    name: "Obstacle tag",
    desc: "In tag mode, only instances tagged with this name block rays. Use for walls, terrain, and static obstacles. Add more tags dynamically via AddObstacleTag action.",
  },
  {
    type: PROPERTY_TYPE.CHECK,
    id: "meshDeformEnabled",
    options: {
      initialValue: true,
    },
    name: "Mesh deform enabled",
    desc: "Write the visibility polygon to the host object's mesh for visual rendering each tick. Disable if the light is invisible or for performance (detection still works). Re-enable with EnableMeshDeform action.",
  },
  {
    type: PROPERTY_TYPE.INTEGER,
    id: "meshUpdateInterval",
    options: {
      initialValue: 1,
      minValue: 1,
    },
    name: "Mesh update interval",
    desc: "How often mesh deformation is written. 1 = every frame. Higher values stagger writes across frames for better performance with many lights.",
  },
  {
    type: PROPERTY_TYPE.COMBO,
    id: "meshStaggerMode",
    options: {
      initialValue: "stable",
      items: [
        { stable: "Stable (freeze between updates)" },
        { hybrid: "Hybrid (live LOS, stagger mesh only)" },
      ],
    },
    name: "Mesh stagger mode",
    desc: "Stable keeps LOS polygon fixed between stagger ticks. Hybrid updates LOS every frame but only writes mesh on stagger ticks.",
  },
  {
    type: PROPERTY_TYPE.CHECK,
    id: "enabled",
    options: {
      initialValue: true,
    },
    name: "Enabled",
    desc: "Whether the behavior is active. When disabled, raycasting and mesh updates are paused. Toggle at runtime with the Set enabled action.",
  }
];
