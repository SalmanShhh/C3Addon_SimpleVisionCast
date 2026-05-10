<img src="./src/icon.svg" width="100" /><br>
# Simple Vision Cast
<i>Mesh-driven line of sight and dynamic lighting for world objects.</i> <br>
### Version 1.0.0.1

[<img src="https://placehold.co/200x50/4493f8/FFF?text=Download&font=montserrat" width="200"/>](https://github.com/SalmanShhh/C3Addon_SimpleVisionCast/releases/download/salmanshh_simplevisioncast-1.0.0.1.c3addon/salmanshh_simplevisioncast-1.0.0.1.c3addon)
<br>
<sub> [See all releases](https://github.com/SalmanShhh/C3Addon_SimpleVisionCast/releases) </sub> <br>

---
<b><u>Author:</u></b> SalmanShh <br>
<sub>Made using [CAW](https://marketplace.visualstudio.com/items?itemName=skymen.caw) </sub><br>

## Table of Contents
- [Usage](#usage)
- [Examples Files](#examples-files)
- [Properties](#properties)
- [Actions](#actions)
- [Conditions](#conditions)
- [Expressions](#expressions)
---
## Usage
To build the addon, run the following commands:

```
npm i
npm run build
```

To run the dev server, run

```
npm i
npm run dev
```

## Examples Files
| Description | Download |
| --- | --- |
| Simple 2D Lighting Example | [<img src="https://placehold.co/120x30/4493f8/FFF?text=Download&font=montserrat" width="120"/>](https://github.com/SalmanShhh/C3Addon_SimpleVisionCast/raw/refs/heads/main/examples/Simple%202D%20Lighting%20Example.c3p) |

---
## Properties
| Property Name | Description | Type |
| --- | --- | --- |
| Range | Maximum ray distance in pixels. Larger range = more expensive raycasting. Towers 500px, torches 250px, guards' eyes 300px. Adjust per use case and frame budget. | float |
| Cone | Angular sweep in degrees. 360 = omnidirectional light. 90 = narrow cone (stealth guards, headlights). Smaller cones are faster to render. | float |
| Ray density | Percentage of ray density. 100% = 1 ray per degree of cone angle. Higher density = smoother polygon but slower. 25% for many lights, 50% for balanced quality, 100% for precision lighting. | percent |
| Obstacle mode | How obstacles are identified. Solid: all objects with the Solid behavior block rays. Custom objects: only selected types block rays. Tag: only instances with a tag block rays. Use Tag mode for flexible, performant obstacle selection. | combo |
| Obstacle tag | In tag mode, only instances tagged with this name block rays. Use for walls, terrain, and static obstacles. Add more tags dynamically via AddObstacleTag action. | text |
| Mesh deform enabled | Write the visibility polygon to the host object's mesh for visual rendering each tick. Disable if the light is invisible or for performance (detection still works). Re-enable with EnableMeshDeform action. | check |
| Mesh update interval | How many frames to skip between mesh writes. 0 = every frame, 1 = skip 1 frame, 2 = skip 2 frames. | integer |
| Mesh stagger mode | Stable keeps LOS polygon fixed between stagger ticks. Hybrid updates LOS every frame but only writes mesh on stagger ticks. | combo |
| Enabled | Whether the behavior is active. When disabled, raycasting and mesh updates are paused. Toggle at runtime with the Set enabled action. | check |


---
## Actions
| Action | Description | Params
| --- | --- | --- |
| Disable mesh deform | Stop deforming the host mesh until re-enabled. |  |
| Enable mesh deform | Resume writing the visibility polygon to the host mesh. |  |
| Reset mesh | Restore the mesh to a flat state and disable deformation. |  |
| Set mesh pin origin | Move the mesh fan origin in normalized host space. | X             *(number)* <br>Y             *(number)* <br> |
| Set max obstacle candidates | Cap the number of obstacle instances tested each rebuild. Candidates are the first N collected by the active obstacle mode. 0 means unlimited. Reduces raycasting cost in dense scenes at the cost of accuracy. | Max candidates             *(number)* <br> |
| Set mesh stagger mode | Switch the mesh stagger strategy. 'Stable' writes the mesh only on the scheduled interval frame. 'Hybrid' also writes whenever the vision polygon refreshes mid-interval. | Mode             *(combo)* <br> |
| Set mesh update interval | Set how many frames to skip between mesh writes. 0 = every frame, 1 = skip 1 frame, 2 = skip 2 frames. | Interval             *(number)* <br> |
| Set mesh update interval (time) | Set a time-based interval (in seconds) between mesh writes. Overrides the frame-based interval while active. Set to 0 to revert to frame-based mode. | Seconds             *(number)* <br> |
| Set raycast skip rate | Rebuild the visibility polygon only once every N frames, regardless of stagger mode. 0 or 1 disables skipping (existing stagger rules apply). 2+ skips N−1 frames between rebuilds. Useful for background or off-screen emitters. | Rate             *(number)* <br> |
| Add obstacle object | Register an object type for custom object obstacle mode. | Object             *(object)* <br> |
| Add obstacle tag | Add obstacle tags in tag mode. Use commas to add multiple tags. | Tag             *(string)* <br> |
| Clear obstacle objects | Remove every registered custom obstacle object type. |  |
| Remove obstacle object | Unregister an object type from custom object obstacle mode. | Object             *(object)* <br> |
| Remove obstacle tag | Remove obstacle tags from the active obstacle tag set. Use commas to remove multiple tags. | Tag             *(string)* <br> |
| Set cone of view | The angle range in degrees relative to the object angle that line-of-sight can cover. | Cone of view             *(number)* <br> |
| Set facing angle | Set the cone angle offset relative to the host object. | Angle             *(number)* <br> |
| Set obstacle mode | Switch how obstacle candidates are collected. | Mode             *(combo)* <br> |
| Set obstacle tag | Set active obstacle tags in tag mode. Use commas to provide multiple tags. | Tag             *(string)* <br> |
| Set range | The maximum distance in pixels that line-of-sight can cover. | Range             *(number)* <br> |
| Set ray count | Set the number of primary rays cast each update. | Ray count             *(number)* <br> |
| Set ray density | Set the ray density as a percentage (1-100). 100% = 1 ray per degree of cone angle. Recalculates on next tick. | Density             *(number)* <br> |
| Set enabled | Enable or disable the Simple Vision Cast behavior. When disabled, raycasting and mesh updates are paused. | Enabled             *(boolean)* <br> |


---
## Conditions
| Condition | Description | Params
| --- | --- | --- |
| On raycast budget exceeded | Triggered after every vision rebuild in which the raycast took longer than the given threshold. Use LastRaycastMs to read the exact duration. Pair with SetRayDensity or SetRaycastSkipRate to reduce cost adaptively. | Budget (ms) *(number)* <br> |
| Has obstacle object | Check whether an object type is registered as a custom obstacle. | Object *(object)* <br> |
| Has obstacle tag | Check whether a tag is in the active obstacle tag set. | Tag *(string)* <br> |
| Is enabled | True when the Simple Vision Cast behavior is currently enabled. |  |
| Is mesh deform enabled | True when polygon data is currently written to the host mesh. |  |
| Is obstacle mode active | Check whether a given obstacle mode is currently active. | Mode *(combo)* <br> |
| On obstacle mode changed | Triggered after the active obstacle mode changes. |  |
| On obstacle tag changed | Triggered after the primary obstacle tag changes in tag mode. |  |
| Is point in visibility | Check whether a world-space point is inside the current visibility polygon. | X *(number)* <br>Y *(number)* <br> |
| On mesh not ready | Triggered when mesh deformation is enabled but no writable mesh is found. |  |
| On polygon updated | Triggered after the visibility polygon is recomputed. |  |


---
## Expressions
| Expression | Description | Return Type | Params
| --- | --- | --- | --- |
| ActiveMeshStaggerMode | Current mesh stagger mode key: "stable" or "hybrid". | string |  | 
| ActiveMeshUpdateInterval | Current number of frames skipped between mesh writes (0 = every frame). | number |  | 
| ActiveMeshUpdateIntervalTime | Current time-based mesh write interval in seconds. Returns 0 when frame-based mode is active. | number |  | 
| ActiveRaycastSkipRate | Current raycast skip rate — frames between vision rebuilds (0 or 1 = no skip). | number |  | 
| LastRaycastMs | Time in milliseconds spent rebuilding the visibility polygon on the most recent update. Use with On raycast budget exceeded or poll each tick to drive adaptive quality. | number |  | 
| ObstacleCandidateCount | Number of obstacle instances that were considered in the most recent vision rebuild. Reflects any active candidate cap. | number |  | 
| ActiveConeOfView | The angle range in degrees relative to the object angle that line-of-sight can cover. | number |  | 
| ActiveFacingAngle | Current facing angle offset in degrees. | number |  | 
| ActiveObstacleMode | Current obstacle mode key. | string |  | 
| ActiveObstacleTag | Current primary obstacle tag, or an empty string outside tag mode. | string |  | 
| ARange | The maximum distance in pixels that line-of-sight can cover. | number |  | 
| CountObstacleObjects | Number of registered custom obstacle object types. | number |  | 
| CountPolyPoints | Number of points in the current visibility polygon. | number |  | 
| GetPolyHitUID | UID hit by a visibility polygon point, or -1 if unobstructed. | number | Index *(number)* <br> | 
| GetPolyPointAngle | Angle in degrees of a visibility polygon point. | number | Index *(number)* <br> | 
| GetPolyPointDist | Distance from the origin to a visibility polygon point. | number | Index *(number)* <br> | 
| GetPolyPointX | World X of a visibility polygon point. | number | Index *(number)* <br> | 
| GetPolyPointY | World Y of a visibility polygon point. | number | Index *(number)* <br> | 
| LastPolygonUpdateTime | Runtime timestamp of the most recent polygon update. | number |  | 
| PolygonArea | Approximate area of the current visibility polygon. | number |  | 


---
## Changelog

**1.0.0.1**

**1.0.0.0**
- **Added:** - Documentation (via Guide file)
- **Added:** - Example Project
- **Added:** - Added Icon.

**0.4.0.0**
- **Added:** - Simplify the Addon More
- **Added:** - support multiple obstacle tags with comma-separated tags
- **Added:** - Add fix to mitigate movement jitter (this was so damn hard)

**0.3.0.0**
- **Added:** - Add ACEs to help with Performance
- **Added:** - Debugger values now editable

**0.2.0.0**
- **Added:** Now Works correctly.
- **Added:** - Added Mesh Stagger Rendering
- **Added:** - Added Ray Density
- **Fixed:** - Fixed Mesh Rendering.

**0.1.0.0**
- **Added:** initial addon version

**0.0.0.0**
- **Added:** Initial release.
