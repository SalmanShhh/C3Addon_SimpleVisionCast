# Simple Vision Cast Guide

**Simple Vision Cast** is a Construct 3 behavior that provides **mesh-driven line-of-sight detection and dynamic lighting** for world objects. It performs real-time raycasting around an object to build a **visibility polygon** (the area the object can "see"), writes that shape to the object's mesh deformer, and triggers events when tagged objects enter or exit the line of sight. Perfect for patrol AI detection, dynamic fog-of-war, vision cones, or any mechanic that needs to know what an object can see in the world.

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [Project Setup](#2-project-setup)
3. [Plugin Properties](#3-plugin-properties)
4. [Obstacle Modes](#4-obstacle-modes)
5. [Ray Casting and Visibility](#5-ray-casting-and-visibility)
6. [Line-of-Sight Detection](#6-line-of-sight-detection)
7. [Mesh Integration](#7-mesh-integration)
8. [Performance Tuning](#8-performance-tuning)
9. [Actions Reference](#9-actions-reference)
10. [Conditions Reference](#10-conditions-reference)
11. [Expressions Reference](#11-expressions-reference)
12. [Triggers Reference](#12-triggers-reference)
13. [System Use Cases](#13-system-use-cases)
14. [Game Use Cases](#14-game-use-cases)
15. [C3 Debugger](#15-c3-debugger)
16. [Scripting](#16-scripting)
17. [Surface Normals and Reflections](#17-surface-normals-and-reflections)
18. [Tips and Common Mistakes](#18-tips-and-common-mistakes)

---

## 1. Core Concepts

### The Problem This Addon Solves

Without Simple Vision Cast, detecting line-of-sight in Construct 3 means manually casting multiple rays in events, checking each one for collisions, then rebuilding the hit data every frame. This is tedious, error-prone, and expensive. Simple Vision Cast automates the entire process: it casts rays around an object in a cone or full circle, collects all the hit points, builds a polygon from them, triggers events when objects enter/exit that polygon, and optionally writes the polygon to a mesh deformer so you can **visualize the light or vision cone in real-time**.

### Key Design Decisions

- **Behavior-based:** Simple Vision Cast is a **behavior** that attaches to individual world objects (sprites, tiledbackgrounds, etc.). Each instance has its own visibility polygon and configuration—no global state.
- **Tick-driven updates:** By default, visibility recalculates every frame. You control this with **Detection Interval** (detection events can be less frequent than polygon updates).
- **Obstacle flexibility:** Choose how to define obstacles: all Solid-behavior instances, a specific list of object types, or instances tagged with a certain tag. Switch modes on the fly.
- **Mesh integration:** The visibility polygon can be written to the host object's mesh deformer, making the light cone or vision radius visible on screen with full sprite effects and blending.

### Key Concepts at a Glance

| Concept | Meaning |
|---|---|
| **Visibility Polygon** | The closed shape describing the area the object can see. Built by casting rays and connecting hit points. |
| **Ray** | A single line cast outward from the object's origin. Primary rays are spaced evenly; corner rays snap to obstacle edges. |
| **Obstacle Candidate** | An object in the world that *might* block rays (Solid behavior, a custom object type, or tagged instance). |
| **Detection Tag** | A tag assigned to objects you want to track enter/exit events for. Independent from obstacle tags. |
| **Line of Sight (LoS)** | A tagged object is considered in LoS if its center point lies inside the visibility polygon. |
| **Mesh Deformation** | The host object's mesh surface is warped so its top row aligns with the visibility polygon boundary. |

### Scenarios Where This Addon Excels

- **Enemy AI patrol and detection**: Guard enemies have a cone-of-view behavior; when a player (detection-tagged) enters the guard's vision cone, trigger alert events and start pursuit.
- **Fog-of-war mechanics**: Each player-controlled unit emits a circular light; terrain and obstacles occlude the light; the mesh deformer renders the lit area, updating the fog texture in real-time.
- **Vision cones and searchlights**: Dynamically morph a searchlight sprite based on obstacles in the environment. Use raycasting to create realistic light spread around walls.
- **Interactive cover systems**: Before firing, check if an enemy has LoS to the player. Build actual sightlines in the level editor, not just distance checks.
- **Dynamic lighting**: Combine Simple Vision Cast with a particle emitter to render realistic light spillage; the polygon tells you where to draw glow effects.
- **NPC awareness and stealth**: Track which objects an NPC can currently see. If the player hides behind an obstacle (LoS broken), the NPC loses the player's location.
- **Level design preview**: Use a placed light instance to visualize which areas of the level are illuminated before shipping.

---

## 2. Project Setup

### Step 1: Add Simple Vision Cast to Your Project

1. In **Construct 3**, open your project.
2. Go to **Project** > **Install New Addon**.
3. Select the **Simple Vision Cast** addon file (`salmanshh_simplevisioncast-X.X.X.c3addon`).
4. The addon is now available in your object types.

### Step 2: Place a Host Object

1. Create a new **event sheet**.
2. In the **Layout editor**, place a **Sprite** in the level (this will host the Simple Vision Cast behavior).
3. Right-click the sprite and select **Add behavior**.
4. Search for **"Simple Vision Cast"** and add it.
5. The sprite is now a light/vision source.

### Step 3: Configure Obstacles and Detection

1. Select the sprite and open the **Properties panel** (right side).
2. Set the following:
   - **Obstacle mode**: Choose how to define what blocks light (`Solid behaviour`, `Custom objects`, or `Tag`).
   - **Light radius**: Maximum distance rays travel (e.g., 300 pixels).
   - **Ray density**: Percentage (1-100) controlling rays per degree of cone angle. 50% for balanced quality, lower for performance.
   - **Detection tag** (optional): Tag name for objects to track entry/exit (e.g., `"player"`).
   - **Mesh deform enabled**: Check this to visualize the light cone on the sprite's mesh.

### Step 4: Create Detection Events

In your event sheet:

```
Event: Simple Vision Cast: On object enter line of sight
  Action: [Your reaction, e.g., "Set enemy.state to 'alert'"]

Event: Simple Vision Cast: On object exit line of sight
  Action: [Your reaction, e.g., "Set enemy.state to 'idle'"]
```

### Step 5: Check the Result

1. **Preview** the layout.
2. The sprite now casts rays and detects line-of-sight to objects tagged with your **Detection tag**.
3. If you enabled **Mesh deform**, the sprite's mesh warps to show the visibility boundary.

---

## 3. Plugin Properties

| Property | Type | Default | Description |
|---|---|---|---|
| **Light radius** | Float (pixels) | 300 | Maximum distance rays travel. Rays that don't hit an obstacle stop at this distance. |
| **Ray arc** | Float (degrees) | 360 | Angular sweep centered on the host's facing angle. `360` = full circle; `90` = quarter circle. |
| **Ray density** | Float (1-100) | 50 | Percentage of ray density. 100% = 1 ray per degree of cone angle. Higher = smoother polygon, lower = better performance. |
| **Obstacle mode** | Combo | `Solid behaviour` | Determines which objects block rays: `Solid behaviour` (all Solid-behavior instances), `Custom objects` (specified object types), or `Tag` (instances with a certain tag). |
| **Obstacle object** | Object picker | *(none)* | Seed object type for `Custom objects` mode. Used to populate the obstacle list in the Properties panel. |
| **Obstacle tag** | Text | `"wall"` | Tag name for obstacles when in `Tag` mode. Instances with this tag block rays. |
| **Detection tag** | Text | *(empty)* | Tag name for objects to track. When non-empty, Simple Vision Cast fires `On object enter/exit LoS` events for tagged objects. Leave empty to disable detection. |
| **Facing angle** | Float (degrees) | 0 | Offset added to the host's angle to rotate the ray cone. Useful if the host sprite doesn't face the direction you want rays cast. |
| **Mesh deform enabled** | Checkbox | Yes | When checked, writes the visibility polygon to the host's mesh deformer each tick. The mesh top row aligns with the polygon boundary. |
| **Detection interval** | Float (seconds) | 0 | Seconds between line-of-sight detection sweeps (enter/exit events). `0` = every tick. Use a larger value to skip detections on some frames for performance. |
| **Enabled** | Checkbox | Yes | When checked, the behavior is active. Uncheck to pause raycasting and mesh updates at startup. Toggle at runtime with the **Set enabled** action. |

---

## 4. Obstacle Modes

Simple Vision Cast offers three ways to define what blocks rays:

### Solid Behaviour Mode

All objects with the **Solid** behavior enabled contribute to raycasting. This is the default and the simplest setup. Just enable the Solid behavior on your walls, floors, and obstacles.

```
Event: On start of layout
  Action: MyLight: Set obstacle mode -> "Solid behaviour"
  // Now all Solid-behavior instances block rays
```

**Pros:** Simple, no configuration needed. **Cons:** Includes all Solid instances, even if you only want certain walls to block light.

### Custom Objects Mode

Specify exactly which object **types** (sprites, tiledbackgrounds, etc.) block rays. Add or remove types on the fly.

```
Event: On start of layout
  Action: MyLight: Set obstacle mode -> "Custom objects"
  Action: MyLight: Add obstacle object -> Wall
  Action: MyLight: Add obstacle object -> DynamicCover
  // Now only instances of Wall and DynamicCover block rays

Event: Player destroys an obstacle
  Action: MyLight: Remove obstacle object -> DynamicCover
```

**Pros:** Precise control. **Cons:** Requires adding each object type explicitly.

### Tag Mode

All instances tagged with a specific tag block rays. Useful for marking obstacles dynamically.

```
Event: On start of layout
  Action: MyLight: Set obstacle mode -> "Tag"
  Action: MyLight: Set obstacle tag -> "opaque"
  // Now all instances tagged "opaque" block rays

Event: A door opens
  Action: Door: Remove tag "opaque"
  // Light passes through the door
```

**Pros:** Dynamic and flexible. **Cons:** Requires tagging instances in advance.

---

## 5. Ray Casting and Visibility

### How Rays Work

Simple Vision Cast casts rays in a circular or cone pattern around the host object:

1. **Primary rays** are spaced evenly across the ray arc (controlled by **Ray count** and **Ray arc** properties).
2. **Corner rays** snap to edges of obstacle polygons, creating smooth boundaries where light wraps around corners.
3. Each ray stops when it hits an obstacle or reaches the **Light radius** limit.
4. The hit points (or radius boundary) form the vertices of the **visibility polygon**.

### Ray Configuration

| Property | Impact |
|---|---|
| **Ray density** | Higher density = smoother polygon but slower. 25% for performance, 50% for balance, 100% for precision. |
| **Ray arc** | `360°` = full circle (all-around vision). `90°` = quarter circle (narrow cone). |
| **Light radius** | Larger radius = bigger detection area but more distant obstacles to test. |
| **Facing angle** | Rotates the cone. Use if the sprite doesn't face the direction you want light cast. |

### Example: Setting Up a 90° Vision Cone

```
Event: On start of layout
  Action: Guard: Set ray arc -> 90
  Action: Guard: Set ray count -> 32
  Action: Guard: Set light radius -> 200
  // Guard has a 90° vision cone, 200 pixels deep, with 32 rays
```

### Polygon Update Events

After rays are cast, Simple Vision Cast fires the **On polygon updated** trigger (once per tick if raycasting happened).

```
Event: Simple Vision Cast: On polygon updated
  Action: Logger: Log expression "Poly points: " & Guard.CountPolyPoints
  // Fires after each raycast, logging polygon complexity
```

### Ray Hit Events

When a primary ray hits an obstacle, the **On ray hit** trigger fires. You can filter by obstacle tag (if in Tag mode) or listen to all hits.

```
Event: Simple Vision Cast: On ray hit
  Action: [Trigger the obstacle, e.g., "Highlight the wall just hit"]

Event: Simple Vision Cast: On ray hit (filter by tag "opaque")
  Action: [Only triggers if the hit obstacle was tagged "opaque"]
```

---

## 6. Line-of-Sight Detection

### Detection Tag and LoS

An object is considered **in line of sight** if:

1. The object is tagged with the **Detection tag** (configured in properties).
2. The object's center point lies inside the visibility polygon.

Simple Vision Cast updates the LoS set every tick (or at the interval specified by **Detection interval**) and fires events when objects enter or exit.

### Detection Events

```
Event: Simple Vision Cast: On object enter line of sight
  Action: [The object just became visible]
  // Use LoSEntrantUID to get the UID of the entering object

Event: Simple Vision Cast: On object exit line of sight
  Action: [The object just became hidden]
  // Use LoSExitantUID to get the UID of the exiting object
```

### Reading Detection State

You can check if an object is currently in LoS:

```
Event: (some condition)
  Condition: Simple Vision Cast: Is object in LoS -> Player
  Action: [Yes, the Player is visible]

Condition: Simple Vision Cast: Is point in visibility -> X, Y
  Action: [Yes, the point (X, Y) is inside the polygon]
```

And retrieve counts:

```
Action: HUD: Set text -> "Visible enemies: " & Guard.CountVisibleObjects
Action: Logger: Log Guard.GetVisibleObjectUID(0)  // First visible object
```

### Example: Enemy Pursuit on Detection

```
Event: Simple Vision Cast: On object enter line of sight
  Action: Enemy.state: Set to "pursuing"
  Action: Enemy: Move towards Player.X, Player.Y

Event: Simple Vision Cast: On object exit line of sight
  Action: Enemy.state: Set to "searching"
  Action: Enemy: Move to last known Player position
```

---

## 7. Mesh Integration

### What Mesh Deformation Does

When **Mesh deform enabled** is checked, Simple Vision Cast writes the visibility polygon to the host object's mesh deformer. Specifically:

- The host object must have its **Mesh deformer** enabled (set in object properties).
- The polygon points are mapped to the mesh's **top row** (row 0), stretched horizontally across all columns.
- All **lower rows** are pinned to a fixed normalized position (default `0.5, 0.5`), creating a cone or fan shape.
- This causes the sprite's visual mesh to warp to match the light/vision boundary.

### Visualizing the Light Cone

```
// In Layout editor, select the sprite
// Right-click: Properties
// Mesh deformer: Enable
// Add Simple Vision Cast behavior

// In the project, set:
Event: On start of layout
  Action: MyLight: Enable mesh deform
  // The sprite's mesh now warps to show the light cone
```

### Setting the Mesh Pin Point

The lower rows of the mesh "pinch" at a point. By default, this is `(0.5, 0.5)` (center of the sprite). You can change it:

```
Action: MyLight: Set mesh pin origin -> 0.5, 0.2
// Lower rows now pinch toward the top-center of the sprite
```

### Mesh Reset

If you need to restore the mesh to its default flat state:

```
Action: MyLight: Reset mesh
// Mesh returns to 0.0, 0.0 to 1.0, 1.0 normalized coordinates
```

### Mesh Deform Workflow

1. Create a sprite with a white radial gradient (full circle, white center fading to transparent edges).
2. Assign the sprite a **bright color** (e.g., yellow for a searchlight).
3. Add **Simple Vision Cast** and enable **Mesh deform**.
4. Add a **blend mode** (e.g., "Additive" or "Screen").
5. Play the scene. The sprite's mesh warps to the light cone and blends on top of the background, creating a dynamic light effect.

### Mesh Not Ready

Sometimes the mesh cannot be initialized (e.g., the object type doesn't support mesh deformers). Simple Vision Cast fires **On mesh not ready** in this case:

```
Event: Simple Vision Cast: On mesh not ready
  Action: Logger: Log "Mesh deformer not available on this object type"
```

---

## 8. Performance Tuning

Simple Vision Cast does two expensive things every frame: **raycasting** (rebuilding the visibility polygon) and **mesh writing** (uploading new vertex positions to the GPU). Both are controllable independently. This section explains what each control does, when to reach for it, and how to combine them for adaptive quality.

### Understanding the Two Cost Buckets

| Operation | Controlled by |
|---|---|
| **Raycasting** — rebuilds the visibility polygon by casting rays against obstacle candidates. Cost scales with ray count × obstacle count. | Ray density, light radius, obstacle candidate cap, raycast skip rate |
| **Mesh writing** — uploads new polygon vertices to the host object's mesh deformer. Cost is roughly constant per instance, but multiplied by the number of instances that update on the same frame. | Mesh update interval (frames or seconds), stagger mode |

Use `LastRaycastMs` and `ObstacleCandidateCount` to measure; use the controls below to reduce cost where it hurts.

---

### Mesh Update Interval (Frames)

**Set mesh update interval** controls how many frames elapse between mesh writes. At `1` (default) the mesh is rewritten every frame. At `4` it is rewritten every fourth frame, cutting mesh-write overhead to 25% of its default cost. Visually, higher intervals mean the light shape updates less frequently — acceptable for slow-moving or stationary lights.

```
Event: On start of layout
  Action: TorchLight: Set mesh update interval -> 3
  // Mesh only rewrites every 3rd frame — good for a stationary torch

  Action: PlayerLight: Set mesh update interval -> 1
  // Player's light still updates every frame for sharp response
```

Read the live value back with `ActiveMeshUpdateInterval`.

### Mesh Update Interval (Time)

**Set mesh update interval (time)** switches the mesh write schedule from frame-counting to wall-clock time (seconds). This is useful when your game targets variable frame rates or when you want to express light-update frequency in human terms ("update this light twice per second") rather than frame counts that mean different things at 30 fps versus 144 fps.

Set it to `0` to revert to frame-based mode.

```
Event: On start of layout
  Action: DistantLight: Set mesh update interval (time) -> 0.1
  // Mesh rewrites at most 10 times per second, regardless of frame rate

Event: Player enters high-detail zone
  Action: DistantLight: Set mesh update interval (time) -> 0
  // Revert to frame-based (every frame) for maximum quality
```

Read the live value back with `ActiveMeshUpdateIntervalTime`. When this is `> 0`, the frame-based interval is ignored.

### Mesh Stagger Mode

When multiple Simple Vision Cast instances share a scene, the **stagger mode** prevents them all from writing to their meshes on the same frame — which would spike GPU upload cost.

| Mode | Behaviour |
|---|---|
| **Stable** | Each instance writes only on its scheduled interval frame. A phase offset (derived from the instance UID) spreads writes across frames automatically. |
| **Hybrid** | Like Stable, but also writes whenever the visibility polygon refreshes mid-interval. Keeps the visual more tightly in sync with the raycasted shape at a small extra cost. |

```
Event: On start of layout
  // 20 background torches — distribute writes, don't care about mid-interval drift
  Action: Torch: Set mesh stagger mode -> "Stable"
  Action: Torch: Set mesh update interval -> 4

  // Player light — always in sync with actual vision
  Action: PlayerLight: Set mesh stagger mode -> "Hybrid"
  Action: PlayerLight: Set mesh update interval -> 1
```

Read the live mode string with `ActiveMeshStaggerMode`.

---

### Raycast Skip Rate

**Set raycast skip rate** rebuilds the visibility polygon only once every N frames, regardless of the mesh stagger schedule. This is an aggressive LOD control: at `2` the polygon is rebuilt on alternate frames; at `4` it refreshes at 15 fps even in a 60 fps game.

The mesh still writes on its own schedule — if raycasting is skipped this frame, the mesh reuses the most recent polygon.

```
Event: On start of layout
  Action: BackgroundLight: Set raycast skip rate -> 3
  // Polygon rebuilds at ~20 fps; mesh still writes on its interval

Event: BackgroundLight enters player viewport
  Action: BackgroundLight: Set raycast skip rate -> 1
  // Restore full-rate raycasting when the light is close
```

Set to `0` or `1` to disable skipping. Read the live value with `ActiveRaycastSkipRate`.

### Max Obstacle Candidates

**Set max obstacle candidates** caps how many obstacle instances are considered each rebuild. Candidates are collected first, then the list is truncated before raycasting begins. This trades correctness for speed in dense scenes: distant or low-priority obstacles at the tail of the list are silently ignored.

`0` means unlimited (default). Use a cap only when `ObstacleCandidateCount` is unusually high and you have confirmed that the extra candidates are not meaningfully affecting the result.

```
Event: On start of layout
  Action: Guard: Set max obstacle candidates -> 30
  // Guard only tests the first 30 collected obstacles per rebuild
  // Acceptable if the layout has hundreds of small debris objects
```

---

### Diagnostics Expressions

These expressions expose the internals of the last rebuild. Use them in the C3 debugger overlay, a developer HUD, or directly in events to drive adaptive quality logic.

| Expression | Returns | What it tells you |
|---|---|---|
| `LastRaycastMs` | Float | Time in milliseconds spent rebuilding the polygon last frame. |
| `ObstacleCandidateCount` | Integer | Number of obstacle instances tested in the last rebuild. |
| `ActiveMeshUpdateInterval` | Integer | Current frame-based mesh write interval. |
| `ActiveMeshUpdateIntervalTime` | Float | Current time-based mesh write interval in seconds (0 = frame mode). |
| `ActiveMeshStaggerMode` | String | Current stagger mode: `"stable"` or `"hybrid"`. |
| `ActiveRaycastSkipRate` | Integer | Current skip rate (0 or 1 = no skipping). |

---

### On Raycast Budget Exceeded

The **On raycast budget exceeded** trigger fires after any rebuild in which `LastRaycastMs` exceeded a threshold you provide. Use it to react to budget spikes without polling every tick.

```
Event: Simple Vision Cast: On raycast took longer than 3 ms
  Action: Self: Set ray density -> Self.ActiveRayArc * 0.9
  // Reduce density by 10% whenever a frame goes over budget

Event: Simple Vision Cast: On raycast took longer than 5 ms
  Action: Self: Set raycast skip rate -> 2
  // Emergency throttle: rebuild every other frame
```

> The trigger fires once per rebuild that exceeded the threshold. If every rebuild is slow, it fires every frame — guard against runaway reduction with a minimum density check.

---

### Choosing the Right Controls

| Situation | Recommended control |
|---|---|
| Many instances, mesh cost high | Raise mesh update interval; use Stable stagger mode |
| Single player light, needs sharp response | Keep interval at 1, use Hybrid stagger |
| Off-screen or distant lights | Raycast skip rate 3–6 + mesh interval 4–8 |
| Dense scene with hundreds of obstacles | Lower ray density first; add candidate cap as last resort |
| Variable frame rate target | Use time-based mesh interval instead of frame-based |
| Unexplained frame spikes | Read `LastRaycastMs` each frame; subscribe to budget trigger |

---

## 9. Actions Reference

### Setup

| Action | Description |
|---|---|
| **Set obstacle mode** | Switch how obstacles are collected: `Solid behaviour`, `Custom objects`, or `Tag`. |
| **Add obstacle object** | In `Custom objects` mode, add an object type to the obstacle list. |
| **Remove obstacle object** | In `Custom objects` mode, remove an object type from the obstacle list. |
| **Clear obstacle objects** | In `Custom objects` mode, remove all object types. |
| **Set obstacle tag** | In `Tag` mode, set the tag that identifies obstacle instances. |
| **Add obstacle tag** | In `Tag` mode, add an additional tag (objects matching any tag block rays). |
| **Remove obstacle tag** | In `Tag` mode, remove a tag. |
| **Set detection tag** | Set the tag used to identify objects for enter/exit LoS events. |
| **Set light radius** | Update the maximum ray distance. |
| **Set ray arc** | Update the angular sweep (e.g., 360 for full circle, 90 for quarter cone). |
| **Set ray density** | Update the ray density percentage. Recalculates rays based on cone angle each tick. |

### Mesh

| Action | Description |
|---|---|
| **Enable mesh deform** | Turn on mesh polygon writing. |
| **Disable mesh deform** | Turn off mesh polygon writing. |
| **Reset mesh** | Restore the mesh to default flat state. |
| **Set mesh pin origin** | Set the normalized (X, Y) point that lower mesh rows pinch toward. |

### Detection

| Action | Description |
|---|---|
| **Force detection sweep** | Immediately run line-of-sight detection (useful if you want to check LoS outside the normal interval). |
| **Clear detected objects** | Clear the visible object list without firing exit events. |

### State

| Action | Description |
|---|---|
| **Set enabled** | Enable or disable the behavior. When disabled, raycasting and mesh updates are paused. |

### Performance

| Action | Description |
|---|---|
| **Set mesh update interval** | Set how many frames elapse between mesh writes (1–8). 1 = every frame; higher values reduce GPU overhead for slow-moving or background lights. |
| **Set mesh update interval (time)** | Set a time-based mesh write interval in seconds. Overrides the frame-based interval while > 0. Set to 0 to revert to frame mode. Useful for consistent behavior across frame rates. |
| **Set mesh stagger mode** | Switch between `Stable` (writes only on scheduled frames, phase-offset by UID) and `Hybrid` (also writes when the polygon refreshes mid-interval). |
| **Set raycast skip rate** | Rebuild the visibility polygon only once every N frames. 0 or 1 = every frame; 2+ = skip N−1 frames between rebuilds. |
| **Set max obstacle candidates** | Cap how many obstacles are tested per rebuild. 0 = unlimited. Reduces raycasting cost in dense scenes at the cost of ignoring distant obstacle candidates. |

---

## 10. Conditions Reference

| Condition | Description |
|---|---|
| **Is object in LoS** | Check if a specific object is currently in the visibility polygon. |
| **Is point in visibility** | Check if a given world coordinate (X, Y) is inside the polygon. |
| **Is mesh deform enabled** | Check if mesh writing is active. |
| **Is obstacle mode active** | Compare the current obstacle mode. |
| **Has obstacle tag** | Check if a tag is in the active obstacle tag set. |
| **Has obstacle object** | In `Custom objects` mode, check if an object type is in the list. |
| **Is enabled** | True when the behavior is currently active (not disabled). |

### Trigger Conditions

| Trigger | Description |
|---|---|
| **On polygon updated** | Fired after each raycast. Use to react to visibility changes. |
| **On ray hit** | Fired when a primary ray hits an obstacle. Optional tag filter. |
| **On object enter line of sight** | Fired when a detection-tagged object enters the polygon. |
| **On object exit line of sight** | Fired when a detection-tagged object leaves the polygon. |
| **On obstacle mode changed** | Fired when the obstacle mode is switched. |
| **On obstacle tag changed** | Fired when the obstacle tag is updated. |
| **On mesh not ready** | Fired when the mesh cannot be initialized. |
| **On raycast budget exceeded** | Fired after any rebuild in which the raycast took longer than the given threshold (ms). Use with `LastRaycastMs` to reduce quality adaptively. |

---

## 11. Expressions Reference

| Expression | Returns | Description |
|---|---|---|
| **CountPolyPoints** | Integer | Number of vertices in the current visibility polygon. |
| **GetPolyPointX(index)** | Float | World X coordinate of polygon vertex at index. |
| **GetPolyPointY(index)** | Float | World Y coordinate of polygon vertex at index. |
| **GetPolyPointAngle(index)** | Float | Angle (in degrees) from origin to polygon vertex at index. |
| **GetPolyPointDist(index)** | Float | Distance (in pixels) from origin to polygon vertex at index. |
| **GetPolyHitUID(index)** | Integer | UID of the obstacle that polygon vertex at index hit, or -1 if at radius limit. |
| **PolygonArea** | Float | Calculated area of the visibility polygon in square pixels. |
| **LastPolygonUpdateTime** | Float | Timestamp (in seconds) when the polygon was last recalculated. |
| **CountVisibleObjects** | Integer | Number of detection-tagged objects currently in LoS. |
| **GetVisibleObjectUID(index)** | Integer | UID of the visible object at index (0 = first, etc.). |
| **LoSEntrantUID** | Integer | UID of the object that just entered LoS (valid in On object enter LoS event). |
| **LoSExitantUID** | Integer | UID of the object that just exited LoS (valid in On object exit LoS event). |
| **RayHitUID** | Integer | UID of the obstacle hit by the last ray (valid in On ray hit event). |
| **RayHitX** | Float | World X of the last ray hit point (valid in On ray hit event). |
| **RayHitY** | Float | World Y of the last ray hit point (valid in On ray hit event). |
| **RayHitAngle** | Float | Angle (in degrees) of the ray that hit (valid in On ray hit event). |
| **RayHitNormalX** | Float | X component of the surface normal at the hit point (-1 to 1). Valid inside On ray hit. |
| **RayHitNormalY** | Float | Y component of the surface normal at the hit point (-1 to 1). Valid inside On ray hit. |
| **RayHitNormalAngle** | Float | Angle (in degrees) of the surface normal at the hit point (0-360). Valid inside On ray hit. |
| **RayHitReflectX** | Float | World X of the reflected ray endpoint from the hit point. Valid inside On ray hit. |
| **RayHitReflectY** | Float | World Y of the reflected ray endpoint from the hit point. Valid inside On ray hit. |
| **RayHitReflectAngle** | Float | Angle (in degrees) of the reflected ray direction (0-360). Valid inside On ray hit. |
| **ActiveObstacleMode** | Text | Current obstacle mode: `"solid_behaviour"`, `"custom_objects"`, or `"tag"`. |
| **ActiveObstacleTag** | Text | Current obstacle tag (in Tag mode). |
| **CountObstacleObjects** | Integer | Number of object types in the custom objects list (0 if not in Custom objects mode). |
| **ActiveLightRadius** | Float | Current light radius in pixels. |
| **ActiveRayArc** | Float | Current ray arc in degrees. |
| **ActiveFacingAngle** | Float | Current facing angle offset in degrees. |
| **IsMeshDeformEnabled** | Boolean | Is mesh writing currently enabled (1 = yes, 0 = no). |
| **IsObstacleModeActive(mode)** | Boolean | Check if a specific obstacle mode is active (1 = yes, 0 = no). |
| **HasObstacleTag(tag)** | Boolean | Check if a tag is in the obstacle tag set (1 = yes, 0 = no). |
| **HasObstacleObject(objectType)** | Boolean | Check if an object type is in the custom objects list (1 = yes, 0 = no). |
| **LastRaycastMs** | Float | Time in milliseconds spent on the most recent visibility polygon rebuild. |
| **ObstacleCandidateCount** | Integer | Number of obstacle instances tested in the most recent rebuild. |
| **ActiveMeshUpdateInterval** | Integer | Current frame-based mesh write interval (1–8). |
| **ActiveMeshUpdateIntervalTime** | Float | Current time-based mesh write interval in seconds. 0 means frame mode is active. |
| **ActiveMeshStaggerMode** | String | Current stagger mode: `"stable"` or `"hybrid"`. |
| **ActiveRaycastSkipRate** | Integer | Current raycast skip rate. 0 or 1 = every frame; 2+ = skipping active. |

---

## 12. Triggers Reference

| Trigger | Fires When | Context Data |
|---|---|---|
| **On polygon updated** | After rays are cast and polygon is rebuilt. | Polygon has new vertices; use `CountPolyPoints`, `GetPolyPointX/Y`, etc. |
| **On ray hit** | A primary ray hits an obstacle (per ray per tick). | Use `RayHitUID`, `RayHitX/Y/Angle`, `RayHitNormalX/Y/Angle`, `RayHitReflectX/Y/Angle` to inspect the hit. Pass tag filter to detect specific hits. |
| **On object enter line of sight** | A detection-tagged object's center enters the polygon. | Use `LoSEntrantUID` to identify the object. |
| **On object exit line of sight** | A detection-tagged object's center exits the polygon. | Use `LoSExitantUID` to identify the object. |
| **On obstacle mode changed** | Obstacle mode is switched via action. | Use `ActiveObstacleMode` to see the new mode. |
| **On obstacle tag changed** | Obstacle tag is updated via action. | Use `ActiveObstacleTag` to see the new tag. |
| **On mesh not ready** | Mesh deformer cannot be initialized. | Mesh writing is disabled; check object type compatibility. |
| **On raycast budget exceeded** | The last rebuild took longer than the given threshold (ms). | Read `LastRaycastMs` for the exact duration. Reduce `SetRayDensity` or raise `SetRaycastSkipRate` to recover frame budget. |

---

## 13. System Use Cases

### Obstacle Collection System

Collects candidate objects that might block rays before raycasting begins. You can switch between three strategies on the fly.

#### Use Case 1: Solid-Only Obstacles

```
Event: On start of layout
  Action: Guard: Set obstacle mode -> "Solid behaviour"
  // Every object with Solid behavior blocks rays
```

**Tip:** Fastest obstacle collection, but includes all Solid instances. Use if everything that blocks light has Solid behavior.

#### Use Case 2: Custom Object Types

```
Event: On start of layout
  Action: Guard: Set obstacle mode -> "Custom objects"
  Action: Guard: Add obstacle object -> Wall
  Action: Guard: Add obstacle object -> Tree
  
Event: A dynamic cover is destroyed
  Action: Guard: Remove obstacle object -> DynamicCover
```

**Tip:** Most flexible - precise control over which object types cast shadows. Efficient for large scenes where most objects don't cast shadows.

#### Use Case 3: Tag-Based Obstacles

```
Event: On start of layout
  Action: Guard: Set obstacle mode -> "Tag"
  Action: Guard: Set obstacle tag -> "shadow_caster"
  // Now instances tagged "shadow_caster" block rays
  
Event: A door opens
  Action: Door: Remove tag "shadow_caster"
  // Light immediately passes through
```

**Tip:** Most dynamic. Useful for doors, destructible obstacles, and state-driven visibility changes.

### Ray Casting System

Casts rays in a pattern around the host, collecting hit points to build the visibility polygon.

#### Use Case 1: Full-Circle Light

```
Event: On start of layout
  Action: Searchlight: Set ray arc -> 360
  Action: Searchlight: Set ray density -> 80%
  // 64 rays in all directions = smooth full-circle light
```

**Tip:** `360°` arc gives omnidirectional vision. Increase ray density for smoother curves around obstacles.

#### Use Case 2: Narrow Vision Cone

```
Event: On start of layout
  Action: Enemy: Set ray arc -> 60
  Action: Enemy: Set ray density -> 20%
  Action: Enemy: Set facing angle -> 0
  // Enemy has a narrow 60° vision cone with 24 rays
  // Set facing angle to rotate the cone if the sprite doesn't face forward
```

**Tip:** Narrower arcs = fewer rays needed for smooth results. Use for guards, turrets, and tunnel vision.

#### Use Case 3: Dynamic Ray Adjustment

```
Event: Player equipped Night Vision goggles
  Action: Player: Set light radius -> 500
  Action: Player: Set ray density -> 60%
  // Light expands and becomes more detailed
  
Event: Player lit a torch (fire is dim)
  Action: Torch: Set light radius -> 150
  Action: Torch: Set ray density -> 25%
```

**Tip:** Tweak ray count and radius at runtime to create power-ups, darkness effects, or different light intensities.

### Detection System

Tracks which objects are inside the visibility polygon and fires enter/exit events.

#### Use Case 1: Enemy Detection on Patrol

```
Event: On start of layout
  Action: Guard: Set detection tag -> "player"
  
Event: Simple Vision Cast: On object enter line of sight
  Action: Guard.alert_sound: Play "alert"
  Action: Guard: Move towards LoSEntrantUID object
  
Event: Simple Vision Cast: On object exit line of sight
  Action: Guard: Move to last known Player position
```

**Tip:** Detection fires independently of ray hits. Even if a ray doesn't directly hit the player, if the player's center is inside the polygon, detection triggers.

#### Use Case 2: Conditional Detection Interval

```
Event: On start of layout
  Action: Enemy: Set detection interval -> 0.5
  // Detection only runs every 0.5 seconds (not every frame)
  
Event: Player uses Stealth
  Action: Enemy: Set detection interval -> 2
  // Slower detection makes stealth easier
```

**Tip:** Increase detection interval to skip detection sweeps and improve performance in crowded scenes.

#### Use Case 3: Point-in-Polygon Queries

```
Event: Some trigger
  Condition: Guard: Is point in visibility -> 400, 300
  Action: [Yes, the point (400, 300) is in the polygon]
```

**Tip:** Test arbitrary world coordinates against the polygon without needing to tag objects. Useful for traps, alarms, or spatial logic.

### Mesh Deformation System

Writes the polygon boundary to the host object's mesh surface, warping the sprite to visualize the light cone.

#### Use Case 1: Dynamic Light Visualization

```
// Layout: Sprite with radial gradient, additive blend

Event: On start of layout
  Action: Light: Enable mesh deform
  
Event: Polygon updated (Simple Vision Cast: On polygon updated)
  // Mesh is rewritten automatically; visual light cone updates in real-time
```

**Tip:** The mesh deformer is updated every frame if the polygon changes. Enable additive or screen blend mode for light effects.

#### Use Case 2: Vision Cone with Pinch Point

```
Event: On start of layout
  Action: Guard: Set mesh pin origin -> 0.5, 0.2
  // Mesh fans out from the top-center of the sprite (not the dead center)
  
Event: Guard rotates
  // Mesh automatically rotates with the host; pinch point stays relative
```

**Tip:** The pin origin is in normalized sprite coordinates (0.0–1.0). Experiment with different values to create asymmetric light shapes.

---

### Performance System

Controls the rate at which the visibility polygon is rebuilt and the rate at which the result is written to the GPU mesh.

#### Use Case 1: Many Background Torches

**Scenario:** A dungeon level with 30 wall torches. All torches are stationary, so a full polygon rebuild every frame is wasteful.

```
Event: On start of layout
  Action: Torch: Set mesh stagger mode -> "Stable"
  Action: Torch: Set mesh update interval -> 4
  Action: Torch: Set raycast skip rate -> 2
  // Each torch rebuilds its polygon every other frame (~30 fps rebuild at 60 fps)
  // Mesh writes are spread across a 4-frame window; the phase offset derived
  // from each instance's UID distributes them automatically
```

**Tip:** Stable stagger + interval 4 means in any given frame at most 1/4 of the torches write their mesh. No manual coordination needed — UID phasing handles it.

#### Use Case 2: Adaptive Quality Under Load

**Scenario:** A mobile game that must stay within a per-frame raycast budget.

```
Event: On start of layout
  Action: Light: Set ray density -> 50

Event: Simple Vision Cast: On raycast took longer than 4 ms
  Condition: Light.ActiveRayArc > 15  // don't go below 15% density
  Action: Light: Set ray density -> Light.ActiveRayArc - 5
  // Step down 5% whenever a rebuild exceeds budget

Event: Simple Vision Cast: On polygon updated
  Condition: Light.LastRaycastMs < 2
  Condition: Light.ActiveRayArc < 50
  Action: Light: Set ray density -> Light.ActiveRayArc + 1
  // Slowly recover quality when things are comfortable
```

**Tip:** Step down in large increments (5–10%), recover in small ones (1–2%). This prevents oscillation around the threshold.

#### Use Case 3: Off-Screen Light Throttling

**Scenario:** Lights far from the player should barely run; lights near the player run at full quality.

```
Event: Every 0.5 seconds
  For each Light
    Condition: distance(Light.X, Light.Y, Player.X, Player.Y) > 800
    Action: Light: Set raycast skip rate -> 6
    Action: Light: Set mesh update interval -> 8

Event: Every 0.5 seconds
  For each Light
    Condition: distance(Light.X, Light.Y, Player.X, Player.Y) <= 800
    Action: Light: Set raycast skip rate -> 1
    Action: Light: Set mesh update interval -> 1
```

**Tip:** Run the distance check every half-second rather than every tick — checking distances every tick for every light is itself a performance cost.

#### Use Case 4: Time-Based Interval for Cross-Platform Consistency

**Scenario:** The game runs on PC at 144 fps and on mobile at 30 fps. A frame-based interval of 4 means very different real-world refresh rates on each platform.

```
Event: On start of layout
  Action: AmbientLight: Set mesh update interval (time) -> 0.05
  // Mesh rewrites ~20 times per second on all platforms
  // At 144 fps this skips ~7 frames between writes
  // At 30 fps this writes almost every frame — correct automatically
```

---

## 14. Game Use Cases

### Use Case 1: Guard AI with Cone-of-View

**Scenario:** A 2D top-down action game. Guards patrol the level and detect the player if they enter the guard's 90° vision cone.

**Layer structure:**
```
Layout: Main
├── Layer: Walls (for obstacles)
├── Layer: Objects (enemies, props)
└── Layer: UI
```

**Event sheet:**
```
Event: On start of layout
  Action: Guard: Set obstacle mode -> "Solid behaviour"
  Action: Guard: Set ray arc -> 90
  Action: Guard: Set ray count -> 32
  Action: Guard: Set light radius -> 250
  Action: Guard: Set detection tag -> "player"
  Action: Guard: Disable mesh deform
  // Guard has a narrow vision cone; no mesh visualization needed

Event: Simple Vision Cast: On object enter line of sight
  Action: Guard.state: Set to "alert"
  Action: Guard: Move towards LoSEntrantUID object

Event: Simple Vision Cast: On object exit line of sight
  Action: Guard.state: Set to "searching"
  Action: Guard.path: Move to last known Player position
```

**Tip:** Use `ray arc = 90°` and `ray density = 25%` for a realistic guard vision cone. Disable mesh deform to save performance.

---

### Use Case 2: Fog of War with Team Lights

**Scenario:** An RTS-like game. Each player's units emit lights; visible areas are revealed; obstacles (trees, buildings) cast shadows that block line-of-sight.

**Layer structure:**
```
Layout: Main
├── Layer: Terrain
├── Layer: Obstacles (trees, buildings)
├── Layer: Units (allied and enemy)
└── Layer: FogOfWar (visual darkness overlay)
```

**Event sheet:**
```
Event: On start of layout
  For each unit type (Soldier, Tank, etc.)
    Action: Unit: Set obstacle mode -> "Tag"
    Action: Unit: Set obstacle tag -> "trees"
    Action: Unit: Set light radius -> 300
    Action: Unit: Set ray density -> 35%
    Action: Unit: Set ray arc -> 360
    Action: Unit: Enable mesh deform
    // Each unit is a circular light with 128 rays

Event: Simple Vision Cast: On polygon updated
  Action: FogOfWar: Update texture based on visible polygon
  // Custom rendering updates the fog overlay in real-time
```

---

### Use Case 3: Searchlight Sweeping

**Scenario:** A spotlight object rotates and sweeps across a dark room. The light cone is visualized with a glowing mesh; anything in the cone is detected.

**Layer structure:**
```
Layout: Main
├── Layer: Room (walls, obstacles)
├── Layer: Light (searchlight sprite)
└── Layer: Objects (crates, enemies)
```

**Event sheet:**
```
Event: On start of layout
  Action: Searchlight: Set ray arc -> 120
  Action: Searchlight: Set ray density -> 20%
  Action: Searchlight: Set light radius -> 400
  Action: Searchlight: Set detection tag -> "entity"
  Action: Searchlight: Enable mesh deform
  Action: Searchlight: Set color -> RGB(255, 255, 100)
  // Yellowish searchlight with mesh deformer

Event: Every tick
  Action: Searchlight: Rotate -> 2 degrees
  // Beam sweeps across the room

Event: Simple Vision Cast: On object enter line of sight
  Action: [Detected entity] Object color flash white
  Action: Logger: Log "Detected: " & LoSEntrantUID
```

**Tip:** Set the sprite blend mode to "Additive" or "Screen" and the light color to a bright yellow or white. The mesh deformer warps the sprite to match the light cone, creating a realistic beam effect.

---

### Use Case 4: NPC Awareness System

**Scenario:** NPCs have different awareness levels. Quiet movement is harder to detect; loud actions are instantly spotted.

**Layer structure:**
```
Layout: Main
├── Layer: World (obstacles)
├── Layer: NPCs
└── Layer: Player
```

**Event sheet:**
```
Event: On start of layout
  For each NPC
    Action: NPC: Set obstacle mode -> "Custom objects"
    Action: NPC: Add obstacle object -> Wall
    Action: NPC: Add obstacle object -> Boulder
    Action: NPC: Set detection tag -> "player"
    Action: NPC: Set detection interval -> 0.2
    // NPCs check for player every 0.2 seconds (not every frame)

Event: Player walks normally
  Action: Player.noise_level: Set to 1
  Action: NPC.detection_radius_multiplier: Set to 1
  // Normal detection
  
Event: Player crouches and walks
  Action: Player.noise_level: Set to 0.3
  Action: NPC.detection_radius_multiplier: Set to 0.3
  Action: NPC: Set light radius -> NPC.base_radius * NPC.detection_radius_multiplier

Event: Simple Vision Cast: On object enter line of sight
  Condition: LoSEntrantUID == Player
  Action: NPC.awareness: Set to "alert"
```

**Tip:** Adjust the light radius dynamically based on player behavior (sneaking vs. running). Combine with particle effects to visualize "noise" propagation.

---

### Use Case 5: Turret Tracking

**Scenario:** Automated turrets scan for targets in a 360° arc and fire at detected enemies.

**Layer structure:**
```
Layout: Main
├── Layer: Walls
├── Layer: Turrets
└── Layer: Enemies
```

**Event sheet:**
```
Event: On start of layout
  Action: Turret: Set obstacle mode -> "Solid behaviour"
  Action: Turret: Set ray arc -> 360
  Action: Turret: Set ray density -> 20%
  Action: Turret: Set light radius -> 500
  Action: Turret: Set detection tag -> "enemy"
  Action: Turret: Disable mesh deform

Event: Simple Vision Cast: On object enter line of sight
  Action: Turret: Look towards LoSEntrantUID object
  Action: Turret: Fire at LoSEntrantUID object

Event: Simple Vision Cast: On object exit line of sight
  Action: Turret: Stop firing
  Action: Turret: Return to idle scan
```

**Tip:** Turrets benefit from high ray density (75%+) for smooth omnidirectional detection. Use `detection interval = 0` for real-time targeting.

---

### Use Case 6: Trap Activation Zone

**Scenario:** Traps activate when a player enters the trap's line-of-sight detection zone. Obstacles (doors, walls) can block the trigger.

**Layer structure:**
```
Layout: Main
├── Layer: Obstacles
├── Layer: Traps
└── Layer: Player
```

**Event sheet:**
```
Event: On start of layout
  Action: Trap: Set obstacle mode -> "Tag"
  Action: Trap: Set obstacle tag -> "wall"
  Action: Trap: Set ray arc -> 180
  Action: Trap: Set ray density -> 10%
  Action: Trap: Set light radius -> 150
  Action: Trap: Set detection tag -> "player"

Event: Simple Vision Cast: On object enter line of sight
  Action: Trap.sprite: Play "activate" animation
  Action: Trap.emitter: Emit particles
  Action: Player: Damage -> 25
  // Trap activates when player is detected
```

**Tip:** Use a low ray density (10-15%) and smaller radius for trigger zones. Disable mesh deform to save performance.

---

### Use Case 7: Shadow Casting and Lighting

**Scenario:** Multiple light sources in a scene cast realistic shadows. Combine mesh deformation with particle effects to render dynamic lighting.

**Layer structure:**
```
Layout: Main
├── Layer: Room (dark)
├── Layer: Lights (glowing sprites)
├── Layer: Shadows (visual overlay)
└── Layer: Objects
```

**Event sheet:**
```
Event: On start of layout
  For each light (TorchLight, CandleLight, ElectricLight)
    Action: Light: Set obstacle mode -> "Solid behaviour"
    Action: Light: Set ray arc -> 360
    Action: Light: Set ray density -> 60%
    // Different lights use different radii based on intensity
    Light radius 200 for torches, 400 for electric lights
    Action: Light: Enable mesh deform
    Action: Light: Set color -> RGB(255, 180, 0) for torches
    
Event: Simple Vision Cast: On polygon updated
  Action: [Update shadow map or particle emitter based on polygon]
  // Dynamic lighting updates each frame
```

**Tip:** High ray density (75%+) and additive blend mode create smooth, realistic light. Combine with a shadow layer sprite set to "Darken" blend mode for contrast.

---

### Use Case 8: Dynamic Door Opening/Closing

**Scenario:** A door blocks light and obstacles. When opened, light passes through; when closed, it blocks again.

**Layer structure:**
```
Layout: Main
├── Layer: Room
├── Layer: Doors
└── Layer: Light sources
```

**Event sheet:**
```
Event: On start of layout
  Action: Light: Set obstacle mode -> "Tag"
  Action: Light: Set obstacle tag -> "solid"
  Action: Door: Add tag "solid"
  // Door initially blocks light

Event: Player presses action near Door
  Action: Door: Play "open" animation
  Action: Door: Remove tag "solid"
  // Light immediately passes through
  // Simple Vision Cast detects the tag removal on next tick

Event: Door: On animation end (close)
  Action: Door: Add tag "solid"
  // Door re-blocks light when fully closed
```

**Tip:** Tag-based obstacle mode is most responsive to state changes. Add/remove tags to dynamically control light blocking.

---

### Use Case 9: Line-of-Sight Ability Targeting

**Scenario:** A player casts a spell that must target an enemy in line-of-sight. The spell fails if an obstacle blocks the path.

**Layer structure:**
```
Layout: Main
├── Layer: Obstacles
├── Layer: Player
└── Layer: Enemies
```

**Event sheet:**
```
Event: Player casts spell "Fireball"
  Condition: Player: Is object in LoS -> Targeted.Enemy
  Action: Enemy: Take damage -> 50
  // Spell succeeds
  
Event: Player casts spell "Fireball"
  Condition: NOT Player: Is object in LoS -> Targeted.Enemy
  Action: HUD: Show message "Line of sight blocked"
  // Spell blocked by obstacle
```

**Tip:** Use the condition `Is object in LoS` to check if a specific object is currently visible. Works even if the object is off-screen.

---

### Use Case 10: Multi-Layer Detection System

**Scenario:** A large fortress with multiple watchtowers. Each tower has independent vision; the fortress detects intruders when ANY tower sees them.

**Layer structure:**
```
Layout: Main
├── Layer: Walls
├── Layer: Towers
├── Layer: Intruders
└── Layer: Alerts
```

**Event sheet:**
```
Event: On start of layout
  For each Tower (Tower1, Tower2, Tower3)
    Action: Tower: Set obstacle mode -> "Solid behaviour"
    Action: Tower: Set ray arc -> 360
    Action: Tower: Set ray density -> 50%
    Action: Tower: Set light radius -> 600
    Action: Tower: Set detection tag -> "intruder"

Event: Any tower detects an intruder
  (Trigger: Simple Vision Cast: On object enter line of sight for any tower)
  Action: Fortress.alert_level: Add 1
  Action: Fortress: Broadcast "Intruder detected"

Event: All towers lose sight of intruders
  (All-clear condition)
  Action: Fortress.alert_level: Subtract 1
  
Event: Fortress.alert_level > 0
  Action: Guards: Pursue intruders
```

**Tip:** Use multiple Simple Vision Cast instances (one per watchtower) for overlapping detection coverage. The global detection condition is the OR of all tower detections.

---

### Use Case 11: Performance Optimization with Culling

**Scenario:** A large outdoor scene with many lights. Use aggressive culling to test only nearby obstacles.

**Layer structure:**
```
Layout: Main
├── Layer: Terrain (many obstacles)
├── Layer: Lights (many light sources)
└── Layer: Objects
```

**Event sheet:**
```
Event: On start of layout
  For each Light
    Action: Light: Set obstacle mode -> "Solid behaviour"
    Action: Light: Set cull mode -> "Radius AABB"
    // Only test obstacles within the light's radius
    Action: Light: Set detection interval -> 0.5
    // Detection sweeps every 0.5 seconds, not every frame
    
Event: Simple Vision Cast: On polygon updated
  // Polygon updates every frame for smooth visuals
  // Detection only updates every 0.5 seconds for performance
```

**Tip:** Separate polygon updates (visual) from detection updates (gameplay). High visual frame rate (smooth light) with lower detection rate (fast detection checks).

---

### Use Case 12: Mesh Deform Pinch Point Variations

**Scenario:** Different light shapes: a searchlight (pinch from top), an ambient light (pinch from center), a flood light (pinch from top with wide spread).

**Event sheet:**
```
Event: On start of layout
  // Searchlight (pinch from top-center)
  Action: Searchlight: Set mesh pin origin -> 0.5, 0.0
  
  // Ambient light (pinch from center)
  Action: AmbientLight: Set mesh pin origin -> 0.5, 0.5
  
  // Flood light (pinch from center-back)
  Action: FloodLight: Set mesh pin origin -> 0.5, 0.8
```

**Tip:** The pin origin is in normalized sprite coordinates (0.0–1.0). Experiment with values to create different light shape aesthetics.

---

### Use Case 13: Save/Load Detection State

**Scenario:** A stealth game with checkpoint saves. On load, restore which enemies are aware of the player.

**Event sheet:**
```
Event: On save game
  For each Enemy
    Action: SaveData: Set "enemy_" & Enemy.uid & "_aware" -> 
      (Enemy.state == "alert") ? 1 : 0

Event: On load game
  For each Enemy
    If SaveData.Get("enemy_" & Enemy.uid & "_aware") == 1
      Action: Enemy.state: Set to "alert"
      Action: Enemy: Move towards last known Player position
```

**Tip:** Simple Vision Cast itself saves LoS state automatically in the behavior's save/load system. This use case is for game-level persistence (saving to a file).

---

### Use Case 14: Dynamic Obstacle Addition/Removal

**Scenario:** A destructible environment. When a wall is destroyed, it stops blocking light.

**Layer structure:**
```
Layout: Main
├── Layer: Destructible walls
├── Layer: Lights
└── Layer: Objects
```

**Event sheet:**
```
Event: On start of layout
  Action: Light: Set obstacle mode -> "Custom objects"
  Action: Light: Add obstacle object -> DestructibleWall
  
Event: Player destroys DestructibleWall
  Action: DestructibleWall: Destroy
  // Wall is gone
  
  // Option 1: Dynamically remove the object type
  Action: Light: Remove obstacle object -> DestructibleWall
  
  // Option 2: Use tag mode instead (easier for partial destruction)
  // If only this specific wall is destroyed, just remove its tag:
  Action: Wall_Instance: Remove tag "obstacle"
```

**Tip:** Custom objects mode is best for this. If you destroy the last instance of an object type, consider removing it from the obstacle list to avoid searching an empty type.

---

### Use Case 15: Cooperative Multi-Light System

**Scenario:** Two characters (e.g., player and ally) shine lights that reveal the level together. Their vision cones are separate but feed into a shared fog-of-war system.

**Layer structure:**
```
Layout: Main
├── Layer: World
├── Layer: Lights (player + ally)
├── Layer: Fog of war overlay
└── Layer: Objects
```

**Event sheet:**
```
Event: On start of layout
  Action: PlayerLight: Set obstacle mode -> "Solid behaviour"
  Action: AllyLight: Set obstacle mode -> "Solid behaviour"
  // Both use same obstacle setup
  
  Action: PlayerLight: Set detection tag -> "enemy"
  Action: AllyLight: Set detection tag -> "enemy"

Event: PlayerLight: On polygon updated OR AllyLight: On polygon updated
  Action: [Merge both polygons into shared FogOfWar texture]
  
Event: (PlayerLight OR AllyLight) On object enter line of sight
  Action: [Enemy became visible to at least one light]
  Action: HUD: Show enemy icon
```

**Tip:** Maintain a merged visibility polygon from multiple lights. Update the shared fog texture whenever ANY light's polygon changes.

---

### Other game use cases

**Tower Defense:** Each tower is a Simple Vision Cast light with full-circle detection (`ray arc = 360`). When enemies enter LoS, the tower targets and fires. Fast detection intervals (`detection interval = 0`) ensure real-time targeting. Towers with longer detection intervals detect threats slower but run more efficiently.

**Stealth Puzzle Games:** Guards have narrow vision cones (`ray arc = 60-90`) with limited sight radius. Players sneak by avoiding line-of-sight. Use mesh deform disabled and low ray counts (16-32) to maximize performance. Tag-based obstacles (doors, walls) can be dynamically opened to create new paths.

**Dungeon Crawlers:** Multiple enemies with overlapping vision cones hunt the player. Use aggressive culling (`cull mode = radius_aabb`) and detection intervals to manage performance. Combine with a global darkness layer to simulate dungeon atmosphere; lights reveal small areas in the dark.

**Real-Time Strategy (RTS):** Unit-type specific vision (scouts see farther, workers see less). Each unit is a Simple Vision Cast light. Update fog-of-war texture from merged light polygons every frame for real-time fog effects.

**Action Roguelike:** Weapons (sword range, bow range, spell cone) are modeled as detection lights. When an enemy enters a weapon's LoS, trigger hit/damage logic. High ray counts (96+) create smooth hit detection for sword arcs.

**Survival Horror:** Dynamic lighting from player-held torches and environmental lights creates tension. Mesh deform with additive blend visualizes light cones. Multiple obstacles cast overlapping shadows. Lower ray counts (32-48) and smaller radius (150-250 pixels) for a claustrophobic feel.

**Puzzle Adventure:** Environmental lights reveal hidden paths or interactive objects. Use `is point in visibility` to detect when a puzzle element becomes illuminated. Combine with animation tweens to create timed puzzle challenges.

**Billiards and Pinball:** Use `RayHitReflectAngle` to predict where a ball will travel after hitting a wall. Aim guides in billiards draw from the cue ball to the obstacle hit point, then draw the reflected direction line. Each successive bounce uses the previous reflect angle as the next ray direction.

**Magic Spell Bouncing:** A fireball or laser spell ricochets off walls. On `On ray hit`, read `RayHitReflectX/Y` and spawn the next projectile segment from there aimed at `RayHitReflectAngle`. Chain multiple bounces for multi-reflect spells.

**Light Beam Puzzles:** Classic mirror-maze puzzle. A laser emitter casts a ray; mirrors redirect the beam using their surface normal and reflect angle. Read `RayHitNormalAngle` to draw the incoming-angle indicator on the mirror sprite. Solve the puzzle when the beam hits the target receptor.

**Ricochet Weapons:** A thrown knife or bouncing grenade predicts its path by walking the reflect chain. Before launching, compute multiple reflect hops using `RayHitReflectX/Y/Angle` and draw a trajectory arc preview.

**Surface Material Detection:** Identify obstacle type from `RayHitUID` when `On ray hit` fires, then use `RayHitNormalAngle` to decide the material response. Metal surfaces reflect fully (spawn spark particle along the normal), wood surfaces absorb (spawn splinter particle), water surfaces spawn ripple along the tangent (normal + 90).

**Sound Propagation:** Simulate echoes by casting rays from a sound source. When a ray hits a surface, record `RayHitX/Y` and `RayHitNormalAngle`. Spawn an echo-emitter at the hit point oriented to the reflect angle. Repeat for secondary bounces. Distance controls echo volume (closer hit = louder echo).

**Damage Falloff by Angle of Incidence:** A projectile deals more damage to surfaces it hits head-on than glancingly. Compute the angle between the ray direction and the surface normal using the dot product of the incoming direction and `RayHitNormalX/Y`. Perpendicular hit (normal angle matches ray) = full damage; grazing hit = reduced damage.

**Wall-Hugging AI Pathfinding:** An AI agent uses Simple Vision Cast rays to feel its surroundings. `RayHitNormalX/Y` for the ray pointing toward the wall gives the surface tangent (rotate normal 90 degrees) to follow along the wall. The AI steers its velocity toward that tangent to slide along walls naturally.

**Sliding and Deflection Physics:** A puck or bubble that slides along walls instead of stopping reads `RayHitReflectAngle` to redirect velocity. No physics behavior required; pure event-sheet math: `Ball.angle = RayHitReflectAngle`, `Ball.Speed = Ball.Speed * 0.85` for friction.

**Shooting Gallery and Aim Assist:** Draw a target reticle at the predicted first hit point by checking `RayHitX/Y` each frame for the player's aim ray. Additionally show the bounce preview at `RayHitReflectX/Y` to help players understand where reflected shots go, a common mechanic in top-down shooters.

**Procedural Dungeon Lighting:** At room generation time, cast rays from each light source and record `RayHitX/Y` for all primary rays. Store these points in an array. When the player moves, skip recasting; just test the player against the stored polygon. Combine with `RayHitNormalAngle` to determine wall face direction for placing shadow decals.

**Reflective Surface Effects:** When a ray hits a mirror-tagged obstacle (`RayHitUID` identifies a Mirror instance), read `RayHitNormalAngle` and spawn a secondary Simple Vision Cast behavior on a hidden sprite positioned at `RayHitX/Y` with its facing angle set to `RayHitReflectAngle`. That secondary light sources the reflected light further into the scene.

**Periscope / Surveillance Camera:** A security camera behavior checks an area using a narrow cone (`ray arc = 15`, `ray count = 8`). On ray hit, use `RayHitNormalAngle` to determine if the ray struck the front face of a door (normal facing outward) vs the side face. Different face normals trigger different alarms.

**Invisible Wall Detection:** For accessibility, indicate to the player which way to push against an obstacle. When a player-attached light ray hits a blocking wall, read `RayHitNormalAngle` and display an arrow sprite at `RayHitX/Y` rotated to that angle, pointing away from the surface.

**Dynamic Shadow Casting for Sprites:** Pair each sprite with a Simple Vision Cast instance and a shadow sprite. In `On ray hit`, position shadow-geometry vertices at `RayHitX/Y`. Use `RayHitNormalX/Y` to project the shadow polygon in the opposite-normal direction. Update shadow mesh geometry in real time as the light or obstacles move.

**Arena Shooters with Wall Bounce:** Players fire shots that bounce off walls. Before shooting, preview the bounce using `RayHitReflectX/Y` and `RayHitReflectAngle` from a cast at the mouse direction. Display a dashed line from weapon to first hit point, then from hit point to reflect endpoint, giving the player a bounce aiming guide.

**Water and Glass Refraction Visuals:** When a ray hits a water-tagged surface, use `RayHitNormalX/Y` to compute the refraction vector (approximate with slight bend from the normal). Spawn a distortion sprite at `RayHitX/Y` stretched along the surface tangent (normal rotated 90) to simulate water caustics.

**Topdown Car Reflections:** Racing game headlights cast rays. When hitting a building wall, read `RayHitNormalAngle` to spawn a glint sprite on the wall face, rotated to the normal angle. Glint fades with distance from the hit point. Multiple rays from the same headlight create a sweep of glints across the wall.

**2D Raytracing Preview Tool:** Build a simple in-editor light preview by casting rays from a placed light marker and drawing lines between each `GetPolyPointX/Y` using a Canvas plugin. For hit obstacles, draw the surface normal as a short line from `RayHitX/Y` in the direction of `RayHitNormalAngle`. Useful for lighting artists debugging a level before adding real assets.

---

## 15. C3 Debugger

Simple Vision Cast includes a debugger section accessible via the **Construct 3 Inspector** panel during preview.

### Opening the Debugger

1. Start a preview session (`F5` or **Run layout**).
2. Press **F12** to open **Developer Tools** (or **Ctrl+Shift+I**).
3. In the **Inspector** tab, select your Simple Vision Cast instance.
4. The **Debugger** section expands, showing live state.

### Debugger Fields

| Field | Type | Meaning |
|---|---|---|
| **obstacleMode** | Text | Current obstacle collection mode: `"solid_behaviour"`, `"custom_objects"`, or `"tag"`. |
| **polyPointCount** | Integer | Number of vertices in the current visibility polygon. Indicates raycast complexity. |
| **obstacleCandidateCount** | Integer | How many potential obstacle instances were tested during the last broadphase cull. High values indicate performance bottlenecks. |
| **visibleObjectCount** | Integer | Number of detection-tagged objects currently inside the polygon. |
| **activeTags** | Text | Comma-separated list of active obstacle tags (if in Tag mode). |
| **lastRaycastMs** | Float | Time (in milliseconds) the last raycast operation took. Use to profile performance. |

### Using the Debugger

**Performance profiling:** Check `lastRaycastMs` to see if raycasting is the bottleneck. If it's > 5ms, reduce ray count or enable culling.

**Configuration validation:** Verify `obstacleMode` and `activeTags` to ensure the setup matches your intent.

**Visibility inspection:** Monitor `polyPointCount` and `visibleObjectCount` in real-time. Sudden spikes might indicate missed optimization.

Example: If `obstacleCandidateCount` is very high (1000+) in a large level, enable `cull mode = radius_aabb` to reduce testing overhead.

---

## 16. Scripting

Simple Vision Cast exposes several actions and methods for C3 Script and JavaScript integration.

### Accessing the Behavior

In a script file, access the Simple Vision Cast behavior like this:

```javascript
// Get the behavior instance attached to a sprite
const lightBehavior = mySprite.behaviors.SimpleVisionCast;

// Check if the behavior exists
if (!lightBehavior) {
  console.log("Simple Vision Cast not attached to this sprite");
}
```

**Important:** The behavior name in script is **"SimpleVisionCast"** (the addon display name without spaces). Construct uses the display name, not the internal ID, for script access.

### Calling Actions from Script

Actions with `expose: true` are callable directly from the behavior prototype. Method names are **PascalCase**, derived from the action filename. For example:

```javascript
// From a.SetObstacleMode.js → SetObstacleMode()
lightBehavior.SetObstacleMode("solid_behaviour");

// From a.SetLightRadius.js → SetLightRadius()
lightBehavior.SetLightRadius(400);

// From a.EnableMeshDeform.js → EnableMeshDeform()
lightBehavior.EnableMeshDeform();

// From a.AddObstacleObject.js → AddObstacleObject()
lightBehavior.AddObstacleObject(runtime.objects.Wall);
```

**Combo parameters** arrive as **0-based indices**. For example, `SetObstacleMode` expects a combo value:

```javascript
// Combo values: 0 = "solid_behaviour", 1 = "custom_objects", 2 = "tag"
lightBehavior.SetObstacleMode(0);  // Same as "solid_behaviour"
lightBehavior.SetObstacleMode(2);  // Same as "tag"
```

### Reading State from Script

Simple Vision Cast exposes no direct getter methods for state. Use **expressions** instead. In a script context, you can access expressions through the debugger info:

```javascript
// Expressions are not directly callable from script.
// Instead, use the debugger or create event actions that set variables.

// Alternative: Store state in variables and update them in events:
Event: Simple Vision Cast: On polygon updated
  Action: Variable polygonPoints: Set to SimpleVisionCast.CountPolyPoints

// Then in script:
let polyCount = polygonPoints.value;
```

### Listening to Events from Script

Subscribe to Simple Vision Cast triggers using `addEventListener`:

```javascript
lightBehavior.addEventListener("OnObjectEnterLoS", () => {
  console.log("Object entered LoS! UID:", lightBehavior.GetProperty("LoSEntrantUID"));
});

lightBehavior.addEventListener("OnObjectExitLoS", () => {
  console.log("Object exited LoS! UID:", lightBehavior.GetProperty("LoSExitantUID"));
});

lightBehavior.addEventListener("OnPolygonUpdated", () => {
  console.log("Polygon updated. Point count:", lightBehavior.GetProperty("CountPolyPoints"));
});

lightBehavior.addEventListener("OnRayHit", () => {
  console.log("Ray hit! Hit UID:", lightBehavior.GetProperty("RayHitUID"));
});
```

**Note:** Event-context accessors (like `LoSEntrantUID`) must be read via `GetProperty()` within the callback, as they are only valid during the event.

### Looping Patterns

If the addon exposes Count + Index expressions (e.g., `CountVisibleObjects` + `GetVisibleObjectUID`), use a `for` loop:

```javascript
// Get all visible objects
const visibleCount = lightBehavior.GetProperty("CountVisibleObjects");
for (let i = 0; i < visibleCount; i++) {
  const uid = lightBehavior.GetProperty(`GetVisibleObjectUID(${i})`);
  console.log(`Visible object ${i}:`, uid);
}

// Get all polygon points
const polyCount = lightBehavior.GetProperty("CountPolyPoints");
for (let i = 0; i < polyCount; i++) {
  const x = lightBehavior.GetProperty(`GetPolyPointX(${i})`);
  const y = lightBehavior.GetProperty(`GetPolyPointY(${i})`);
  console.log(`Polygon point ${i}: (${x}, ${y})`);
}
```

### Complete Example

Here's a realistic script usage combining actions, state queries, and event listeners:

```javascript
// Initialize a guard light
class Guard {
  constructor(guardSprite) {
    this.sprite = guardSprite;
    this.light = guardSprite.behaviors.SimpleVisionCast;
    this.detectedEnemies = new Set();
    this.state = "idle";
    
    // Set up light
    this.light.SetObstacleMode(0); // solid_behaviour
    this.light.SetLightRadius(250);
    this.light.SetRayArc(90);
    this.light.SetRayDensity(25);
    this.light.SetDetectionTag("enemy");
    
    // Listen for detections
    this.light.addEventListener("OnObjectEnterLoS", () => this.onEnemySeen());
    this.light.addEventListener("OnObjectExitLoS", () => this.onEnemyLost());
  }
  
  onEnemySeen() {
    const enemyUID = this.light.GetProperty("LoSEntrantUID");
    this.detectedEnemies.add(enemyUID);
    this.state = "alert";
    console.log(`Guard alert! Enemy detected: ${enemyUID}`);
  }
  
  onEnemyLost() {
    const enemyUID = this.light.GetProperty("LoSExitantUID");
    this.detectedEnemies.delete(enemyUID);
    if (this.detectedEnemies.size === 0) {
      this.state = "searching";
      console.log("All enemies lost sight of. Returning to patrol.");
    }
  }
  
  getDetectedEnemies() {
    return Array.from(this.detectedEnemies);
  }
  
  setAlertLevel(level) {
    // Adjust light properties based on alert level
    this.light.SetRayDensity(level === "high" ? 80 : 40);
    this.light.SetDetectionInterval(level === "high" ? 0 : 0.2);
  }
}

// Usage
const guardSprite = runtime.objects.Guard.getAllInstances()[0];
const guard = new Guard(guardSprite);

// Check detected enemies each frame
setInterval(() => {
  const enemies = guard.getDetectedEnemies();
  console.log(`Guard is tracking ${enemies.length} enemies`);
}, 1000);
```

---

## 17. Surface Normals and Reflections

Every time a primary ray hits an obstacle, Simple Vision Cast computes the **surface normal** and the **reflected ray direction** for that hit. These are available as expressions inside the `On ray hit` trigger and let you build physically-grounded reactions to light and projectiles touching surfaces.

### Key Expressions

| Expression | Returns | What it gives you |
|---|---|---|
| `RayHitNormalX` | Float (-1 to 1) | X component of the unit surface normal at the hit point. |
| `RayHitNormalY` | Float (-1 to 1) | Y component of the unit surface normal at the hit point. |
| `RayHitNormalAngle` | Float (0-360 degrees) | Angle of the normal, convenient for rotating sprites. |
| `RayHitReflectX` | Float (world pixels) | World X of the reflected ray endpoint (hit point + reflected direction * remaining radius). |
| `RayHitReflectY` | Float (world pixels) | World Y of the reflected ray endpoint. |
| `RayHitReflectAngle` | Float (0-360 degrees) | Direction angle of the reflected ray, ready to plug into an object angle or Bullet behavior. |

### How Normals Are Computed

When a ray hits a segment of an obstacle polygon, Simple Vision Cast takes the segment vector `(x2-x1, y2-y1)`, rotates it 90 degrees to get the perpendicular, normalizes it to unit length, and then flips it if needed so it faces toward the ray source. This gives a normal that always points away from the surface toward open space.

### How the Reflect Endpoint Is Computed

The reflected direction is `r = d - 2*(d dot n)*n`, where `d` is the incoming ray unit direction and `n` is the surface normal. The reflect endpoint is the hit point plus that reflected direction times the remaining ray distance (`light_radius - hit_dist`). This means the reflect endpoint represents where the ray would have traveled if the surface were a perfect mirror.

### All six expressions are valid inside `On ray hit` only

They are set fresh for each primary ray that hits. Reading them outside an `On ray hit` handler gives you the values from the most recent hit, which may not be meaningful.

### Use Case: Laser Bounce Preview

Draw a two-segment laser line: the initial ray to the wall and then the bounce.

```
Event: Simple Vision Cast: On ray hit
  Action: Line: Set start -> RayHitX - Light.X, RayHitY - Light.Y  // first segment
  Action: BounceIndicator: Set position -> RayHitX, RayHitY
  Action: BounceIndicator: Set angle -> RayHitReflectAngle
  Action: BounceIndicator.length: Set to ActiveLightRadius - RayHitDist
  // BounceIndicator is a thin white sprite that shows where the reflected beam goes
```

### Use Case: Surface-Type Reactions

Identify which obstacle was hit via `RayHitUID` and apply a material-specific effect oriented along the normal.

```
Event: Simple Vision Cast: On ray hit
  // Spawn a spark particle on metal surfaces
  Condition: RayHitUID == MetalWall.UID
  Action: SparkEmitter: Create at RayHitX, RayHitY
  Action: SparkEmitter: Set angle -> RayHitNormalAngle
  Action: SparkEmitter: Emit 5 particles

Event: Simple Vision Cast: On ray hit
  // Spawn a scorch decal on wood surfaces
  Condition: RayHitUID == WoodPanel.UID
  Action: Scorch: Create at RayHitX, RayHitY
  Action: Scorch: Set angle -> RayHitNormalAngle + 180  // face outward from wall
```

### Use Case: Wall-Bounce Projectile

A bullet that bounces off walls instead of stopping.

```
Event: Simple Vision Cast: On ray hit
  // Check if the bullet ray hit an obstacle
  Condition: RayHitUID != -1
  Action: Bullet: Move to RayHitX, RayHitY
  Action: Bullet: Set angle -> RayHitReflectAngle
  // Speed is unchanged; the Bullet behavior now travels in the reflected direction
  Action: Bullet.bounces: Subtract 1

Event: Bullet.bounces <= 0
  Action: Bullet: Destroy
```

### Use Case: Normal-Aligned Shadow Decals

Project a shadow blob onto a wall at the hit point, stretched along the wall face.

```
Event: Simple Vision Cast: On ray hit
  Action: ShadowDecal: Create at RayHitX, RayHitY
  Action: ShadowDecal: Set angle -> RayHitNormalAngle + 90  // align along wall tangent
  Action: ShadowDecal: Set width -> 80
  Action: ShadowDecal: Set height -> 12
  // Flat rectangle lying flush against the wall surface
```

### Use Case: Echo Emitter for Sound Design

Simulate acoustic reflections. When a sound source ray hits a surface, place an echo emitter at the hit point aimed in the reflect direction.

```
Event: Simple Vision Cast: On ray hit
  // Only react to close hits (strong echo)
  Condition: ActiveLightRadius - RayHitDist < 200
  Action: EchoEmitter: Create at RayHitX, RayHitY
  Action: EchoEmitter: Set angle -> RayHitReflectAngle
  Action: EchoEmitter.volume: Set to 1 - (RayHitDist / ActiveLightRadius)
  // Closer hit = louder echo
```

### Use Case: Mirror Objects in Light Puzzle

Mirror tiles redirect a light beam. When the beam hits a mirror, spawn a secondary Simple Vision Cast emitter at the reflect position.

```
Event: Simple Vision Cast: On ray hit
  Condition: (Pick Mirror by UID RayHitUID)  // UID belongs to a mirror tile
  Action: ReflectedBeam: Create at RayHitX, RayHitY
  Action: ReflectedBeam.SimpleVisionCast: Set facing angle -> RayHitReflectAngle
  Action: ReflectedBeam.SimpleVisionCast: Set ray arc -> 10
  Action: ReflectedBeam.SimpleVisionCast: Set ray count -> 8
  // Narrow beam continues from mirror in the reflected direction
```

---

## 18. Tips and Common Mistakes

### 1. Detection Tag Must Be Set

If **Detection tag** is empty in properties, no `On object enter/exit LoS` events will fire. Set it to a non-empty string and tag your objects accordingly.

```
// WRONG:
Event: On start of layout
  // Detection tag is empty in properties
  // No events will fire

// CORRECT:
Event: On start of layout
  Action: Light: Set detection tag -> "player"
  Tag: Player instance with "player"
  // Now events will fire
```

### 2. Obstacle Mode Mismatches

Ensure your chosen **Obstacle mode** matches how obstacles are configured:

- **Solid behaviour mode**: All obstacles must have the **Solid** behavior enabled. If a wall doesn't have Solid behavior, it won't block rays.
- **Custom objects mode**: You must explicitly add object types via `Add obstacle object`. Adding a type adds ALL instances of that type.
- **Tag mode**: All obstacles must be tagged with the specified tag. Untagged instances won't block rays.

### 3. Ray Density Too Low or Too High

- **Too low** (< 10%): Visibility polygon looks jagged. At very low densities, rays may miss fine details.
- **Too high** (> 100%): No benefit—capped at 100%, and uses more CPU than needed.
- **Sweet spot**: 25–75% for most use cases. 50% is a solid balance.

### 4. Light Radius Not Matching Level Scale

If your level is 2000×2000 pixels but the light radius is 300, the light seems weak. Adjust radius to match the scale:

```
// Large level (2000×2000 pixels)
Action: Light: Set light radius -> 800

// Small level (500×500 pixels)
Action: Light: Set light radius -> 150
```

### 5. Mesh Deform Without a Mesh Deformer

The object's mesh deformer must be **enabled** before Simple Vision Cast can write to it. Some object types don't support mesh deformers (e.g., Tiledbackground):

```
// WRONG:
// Select sprite, Mesh deformer = disabled
// Simple Vision Cast tries to write anyway
// Fires: On mesh not ready

// CORRECT:
// Select sprite, Mesh deformer = enabled
// Simple Vision Cast writes successfully
```

### 6. Angle in Radians, Not Degrees

When accessing the host's angle in script, remember it's in **radians**:

```javascript
// WRONG:
const angle = lightBehavior.GetProperty("ActiveFacingAngle"); // In degrees
const rad = angle; // Wrong! This is degrees, not radians

// CORRECT:
const angleDeg = lightBehavior.GetProperty("ActiveFacingAngle");
const angleRad = (angleDeg * Math.PI) / 180;
```

### 7. Detection Only Works on Center Points

Line-of-sight checks if an object's **center point** is inside the polygon. If an object is large but its center is outside, it won't be detected:

```
// WRONG:
// A large enemy's center is outside the polygon
// Even though parts of it are visible, detection doesn't trigger

// CORRECT:
// Only trigger actions when the object's center is inside
Condition: Light: Is object in LoS -> Enemy
Action: [Yes, center is inside]
```

### 8. Performance: Many Lights on Mobile

Each Simple Vision Cast light costs performance. On mobile, use:

- Fewer lights (combine multiple lights into one if possible).
- Lower ray density (25% instead of 75%).
- Larger detection intervals (0.5 seconds instead of every tick).
- Enable `cull mode = radius_aabb` to reduce obstacle testing.

### 10. Detection Interval vs. Polygon Update

**Detection Interval** controls how often enter/exit events fire, NOT how often the polygon updates. The polygon always updates every frame (if raycasting happens). Use `Detection interval > 0` only to optimize detection checks:

```
// Fast polygon updates, slower detection
Action: Light: Set detection interval -> 0.5
// Polygon redraws every tick (smooth visuals)
// Detection sweeps every 0.5 seconds (cheaper)
```

### 11. Custom Objects Mode Adds All Instances

When you `Add obstacle object -> WallType`, **all current and future instances** of WallType block rays:

```
// Adds ALL Walls, not just specific ones
Action: Light: Add obstacle object -> Wall

// If you want selective blocking, use Tag mode instead:
Action: Light: Set obstacle mode -> "Tag"
Action: Light: Set obstacle tag -> "opaque"
// Only tag the walls you want to block
```

### 12. Polygon Point Indices Out of Bounds

Always check bounds before accessing polygon points:

```
Event: (some trigger)
  Condition: Light: CountPolyPoints >= 3
  Action: Logger: Log Light.GetPolyPointX(0)
  
  // WRONG: No bounds check
  Condition: Light: CountPolyPoints >= 1
  Action: Logger: Log Light.GetPolyPointX(99) // Crash if only 1 point
```

---

## Summary

**Simple Vision Cast** is a powerful, production-ready behavior for line-of-sight detection and dynamic lighting in Construct 3. It abstracts away complex raycasting logic, provides flexible obstacle modes, and integrates seamlessly with mesh deformation for visual feedback. Whether you're building stealth games, tower defense, RTS, or dungeon crawlers, Simple Vision Cast handles the heavy lifting so you can focus on gameplay.

Key takeaways:

- Set **Detection tag** to enable enter/exit events.
- Choose an **Obstacle mode** that fits your level design.
- Adjust **Ray arc**, **Ray count**, and **Light radius** for your aesthetic.
- Enable **Mesh deform** to visualize the light cone.
- Use **Detection interval** to balance performance.

Happy lighting!
