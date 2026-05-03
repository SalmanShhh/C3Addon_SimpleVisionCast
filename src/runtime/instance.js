import { id, addonType } from "../../config.caw.js";
import AddonTypeMap from "../../template/addonTypeMap.js";

const OBSTACLE_MODES = ["solid_behaviour", "custom_objects", "tag"];
const STAGGER_MODES = ["stable", "hybrid"];
const EPSILON_ANGLE = 0.001;

export default function (parentClass) {
  return class extends parentClass {
    constructor() {
      super();
      const properties = this._getInitProperties() || [];

      this.events = {};

      this._lightRadius = Math.max(0, Number(properties[0]) || 300);
      this._rayArc = this._clamp(Number(properties[1]) || 360, 1, 360);
      this._rayDensity = this._clamp(Number(properties[2]) || 0.5, 0.01, 1);
      this._obstacleMode = this._combo(properties[3], OBSTACLE_MODES);
      const initialObstacleTags = this._parseTagList(
        typeof properties[4] === "string" ? properties[4] : "wall"
      );
      this._primaryObstacleTag = initialObstacleTags[0] || "";
      this._meshDeformEnabled = properties[5] !== undefined ? !!properties[5] : true;
      this._meshUpdateInterval = this._clamp(Math.floor(Number(properties[6]) || 0), 0, 8, 0);
      this._meshStaggerMode = this._combo(properties[7], STAGGER_MODES);
      this._meshUpdateCounter = 0;
      this._meshUpdatePhase = 0;

      this._obstacleTagSet = new Set(initialObstacleTags);

      // obstacle objects tracked by display name (stable across save/load)
      this._obstacleObjectRefs = new Map();

      this._polyPoints = [];
      this._meshPolyPoints = [];
      this._lastObstacleCandidates = [];

      this._pinNormX = 0.5;
      this._pinNormY = 0.5;

      this._meshApi = null;
      this._meshSizeApi = null;
      this._meshCreateApi = null;
      this._meshCols = 0;
      this._meshRows = 0;
      this._meshReady = false;
      this._meshNotReadyReported = false;

      this._lastPolygonUpdateTime = 0;
      this._lastRaycastMs = 0;
      this._obstacleCandidateCount = 0;

      // Performance controls
      this._raycastSkipRate = 0;    // 0/1 = no skip; N>1 = rebuild every N frames
      this._raycastSkipCounter = 0;
      this._maxObstacleCandidates = 0; // 0 = unlimited
      this._meshUpdateIntervalTime = 0; // 0 = use frame mode; >0 = seconds between mesh writes
      this._meshUpdateTimeAccumulator = 0;

      this._enabled = properties[8] !== undefined ? !!properties[8] : true;

      // Use post-events tick so event-sheet angle changes are reflected this frame.
      this._setTicking2(true);

      this._didRebuildVisionThisFrame = false;
    }

    onCreate() {
      const uid = this._getUID(this.instance);
      const period = this._meshUpdateInterval + 1;
      this._meshUpdatePhase = uid === -1 ? 0 : (Math.abs(uid) % period);
      this._refreshMeshDimensions();
    }

    _updateVisionFrame() {
      const shouldWriteMesh = this._shouldWriteMeshThisFrame();
      this._didRebuildVisionThisFrame = false;

      let shouldUpdateVision;
      if (this._raycastSkipRate >= 2) {
        this._raycastSkipCounter = (this._raycastSkipCounter + 1) % this._raycastSkipRate;
        shouldUpdateVision = this._raycastSkipCounter === 0;
      } else {
        shouldUpdateVision = this._meshStaggerMode === "hybrid" || shouldWriteMesh;
      }

      if (shouldUpdateVision) {
        const raycastStart = performance.now();
        let candidates = this._collectObstacleCandidates();
        if (this._maxObstacleCandidates > 0 && candidates.length > this._maxObstacleCandidates) {
          candidates = candidates.slice(0, this._maxObstacleCandidates);
        }
        this._lastObstacleCandidates = candidates;
        this._obstacleCandidateCount = candidates.length;
        this._rebuildVisibilityPolygon(candidates);
        this._didRebuildVisionThisFrame = true;
        this._lastRaycastMs = performance.now() - raycastStart;
        this._lastPolygonUpdateTime = this._getRuntimeTime();
        this._trigger("OnPolygonUpdated");
        this._trigger("OnRaycastBudgetExceeded");
      }

      if (this._meshDeformEnabled && shouldWriteMesh) {
        this._writePolygonToMesh();
      }

    }

    _tick() {
      // Intentionally unused. Vision update runs in _tick2() after events.
    }

    _tick2() {
      if (!this._enabled) return;
      this._updateVisionFrame();
    }

    _trigger(method) {
      this.dispatch(method);
      super._trigger(self.C3[AddonTypeMap[addonType]][id].Cnds[method]);
    }

    on(tag, callback, options) {
      if (!this.events[tag]) {
        this.events[tag] = [];
      }
      this.events[tag].push({ callback, options });
    }

    off(tag, callback) {
      if (this.events[tag]) {
        this.events[tag] = this.events[tag].filter(
          (event) => event.callback !== callback
        );
      }
    }

    dispatch(tag) {
      if (this.events[tag]) {
        this.events[tag].forEach((event) => {
          if (event.options && event.options.params) {
            const fn = self.C3[AddonTypeMap[addonType]][id].Cnds[tag];
            if (fn && !fn.call(this, ...event.options.params)) {
              return;
            }
          }
          event.callback();
          if (event.options && event.options.once) {
            this.off(tag, event.callback);
          }
        });
      }
    }

    _release() {
      super._release();
    }

    _saveToJson() {
      return {
        obstacleMode: this._obstacleMode,
        obstacleTags: Array.from(this._obstacleTagSet),
        primaryObstacleTag: this._primaryObstacleTag,
        obstacleObjectNames: Array.from(this._obstacleObjectRefs.keys()),
        lightRadius: this._lightRadius,
        rayArc: this._rayArc,
        rayDensity: this._rayDensity,
        meshDeformEnabled: this._meshDeformEnabled,
        meshUpdateInterval: this._meshUpdateInterval,
        meshStaggerMode: this._meshStaggerMode,
        pinNormX: this._pinNormX,
        pinNormY: this._pinNormY,
        enabled: this._enabled,
        raycastSkipRate: this._raycastSkipRate,
        maxObstacleCandidates: this._maxObstacleCandidates,
        meshUpdateIntervalTime: this._meshUpdateIntervalTime,
      };
    }

    _loadFromJson(o) {
      this._obstacleMode = OBSTACLE_MODES.includes(o?.obstacleMode)
        ? o.obstacleMode
        : this._obstacleMode;
      const savedTags = Array.isArray(o?.obstacleTags)
        ? o.obstacleTags.flatMap((t) => this._parseTagList(t))
        : [];
      const primaryTags = this._parseTagList(
        typeof o?.primaryObstacleTag === "string" ? o.primaryObstacleTag : this._primaryObstacleTag
      );
      const mergedTags = [...savedTags, ...primaryTags];
      this._obstacleTagSet = new Set(mergedTags);
      this._primaryObstacleTag = mergedTags[0] || "";
      this._lightRadius = Math.max(0, Number(o?.lightRadius) || this._lightRadius);
      this._rayArc = this._clamp(Number(o?.rayArc) || this._rayArc, 1, 360);
      this._rayDensity = this._clamp(Number(o?.rayDensity) || this._rayDensity, 0.01, 1);
      this._meshDeformEnabled = o?.meshDeformEnabled !== undefined
        ? !!o.meshDeformEnabled
        : this._meshDeformEnabled;
      this._setMeshUpdateInterval(Number(o?.meshUpdateInterval));
      this._meshStaggerMode = STAGGER_MODES.includes(o?.meshStaggerMode)
        ? o.meshStaggerMode
        : this._meshStaggerMode;
      this._pinNormX = this._clamp(Number(o?.pinNormX), 0, 1, this._pinNormX);
      this._pinNormY = this._clamp(Number(o?.pinNormY), 0, 1, this._pinNormY);
      this._enabled = o?.enabled !== false;
      this._setRaycastSkipRate(Number(o?.raycastSkipRate) || 0);
      this._maxObstacleCandidates = Math.max(0, Math.floor(Number(o?.maxObstacleCandidates) || 0));
      this._setMeshUpdateIntervalTime(Number(o?.meshUpdateIntervalTime) || 0);
      this._obstacleObjectRefs.clear();
      // Restore custom obstacle objects by name via runtime.objects
      const runtime = this._getRuntime();
      if (Array.isArray(o?.obstacleObjectNames) && runtime?.objects) {
        for (const typeName of o.obstacleObjectNames) {
          const objectType = runtime.objects[typeName];
          if (objectType) this._obstacleObjectRefs.set(typeName, objectType);
        }
      }

      this._refreshMeshDimensions();
    }

    _setMeshStaggerMode(mode) {
      this._meshStaggerMode = this._combo(mode, STAGGER_MODES);
    }

    _setRaycastSkipRate(rate) {
      this._raycastSkipRate = Math.max(0, Math.floor(Number(rate) || 0));
      this._raycastSkipCounter = 0;
    }

    _setMaxObstacleCandidates(count) {
      this._maxObstacleCandidates = Math.max(0, Math.floor(Number(count) || 0));
    }

    _setMeshUpdateInterval(interval) {
      const numericInterval = Number(interval);
      const nextInterval = Number.isFinite(numericInterval)
        ? this._clamp(Math.floor(numericInterval), 0, 8, 0)
        : this._meshUpdateInterval;
      this._meshUpdateInterval = nextInterval;
      this._meshUpdateCounter = 0;
      const period = this._meshUpdateInterval + 1;
      const uid = this._getUID(this.instance);
      this._meshUpdatePhase = uid === -1 ? 0 : (Math.abs(uid) % period);
    }

    _setMeshUpdateIntervalTime(seconds) {
      this._meshUpdateIntervalTime = Math.max(0, Number(seconds) || 0);
      this._meshUpdateTimeAccumulator = 0;
    }

    _parseTagList(value) {
      const raw = String(value || "");
      if (!raw) {
        return [];
      }

      const unique = new Set();
      for (const part of raw.split(",")) {
        const tag = String(part || "").trim();
        if (tag) {
          unique.add(tag);
        }
      }

      return Array.from(unique);
    }

    _shouldWriteMeshThisFrame() {
      if (this._meshUpdateIntervalTime > 0) {
        const dt = this._getRuntime()?.dt ?? 0;
        this._meshUpdateTimeAccumulator += dt;
        if (this._meshUpdateTimeAccumulator >= this._meshUpdateIntervalTime) {
          this._meshUpdateTimeAccumulator -= this._meshUpdateIntervalTime;
          return true;
        }
        return false;
      }

      this._meshUpdateCounter++;
      if (this._meshUpdateInterval <= 0) {
        return true;
      }

      const period = this._meshUpdateInterval + 1;
      return ((this._meshUpdateCounter + this._meshUpdatePhase) % period) === 0;
    }

    _combo(value, keys) {
      if (typeof value === "string") {
        return keys.includes(value) ? value : keys[0];
      }

      const index = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 0;
      return keys[index] ?? keys[0];
    }

    _clamp(value, min, max, fallback = min) {
      if (!Number.isFinite(value)) {
        return fallback;
      }

      return Math.max(min, Math.min(max, value));
    }

    _degToRad(degrees) {
      return degrees * (Math.PI / 180);
    }

    _radToDeg(radians) {
      return radians * (180 / Math.PI);
    }

    _normalizeAngle(angle) {
      let normalized = angle % 360;
      if (normalized < 0) {
        normalized += 360;
      }
      return normalized;
    }

    _angleDistance(angle, reference) {
      return this._normalizeAngle(angle - reference);
    }

    _getRuntime() {
      return this.runtime || this.instance?.runtime || null;
    }

    _getRuntimeTime() {
      const runtime = this._getRuntime();
      // IRuntime.gameTime is the authoritative clock in the C3 scripting API
      return runtime?.gameTime ?? runtime?.layout?.time ?? 0;
    }

    _getInstanceAngleRadians() {
      // C3 IWorldInstance.angle is always in radians
      const angle = Number(this.instance?.angle);
      return Number.isFinite(angle) ? angle : 0;
    }

    _getFacingAngleDegrees() {
      return this._normalizeAngle(this._radToDeg(this._getInstanceAngleRadians()));
    }

    _getOriginX() {
      return Number(this.instance?.x) || 0;
    }

    _getOriginY() {
      return Number(this.instance?.y) || 0;
    }

    _getUID(instance) {
      if (!instance) {
        return -1;
      }
      // C3 IInstance.uid is always a plain number on runtime instances
      const uid = Number(instance.uid);
      return Number.isFinite(uid) ? uid : -1;
    }

    _getHostSize() {
      return {
        width: Math.max(1, Math.abs(Number(this.instance?.width) || 1)),
        height: Math.max(1, Math.abs(Number(this.instance?.height) || 1)),
      };
    }

    _setHostSize(width, height) {
      const w = Math.max(1, Number(width) || 1);
      const h = Math.max(1, Number(height) || 1);
      const target = this.instance;
      if (!target) {
        return false;
      }

      const setSize = target.setSize || target.SetSize;
      if (typeof setSize === "function") {
        try {
          setSize.call(target, w, h);
          return true;
        } catch (_) {
        }
      }

      try {
        target.width = w;
        target.height = h;
        return true;
      } catch (_) {
        return false;
      }
    }

    _ensureHostCoverageForRange() {
      const desired = Math.max(2, this._lightRadius * 2);
      const current = this._getHostSize();
      if (current.width >= desired && current.height >= desired) {
        return;
      }

      this._setHostSize(Math.max(current.width, desired), Math.max(current.height, desired));
    }

    _getBoundingBox(instance) {
      if (!instance) {
        return null;
      }

      const direct = instance.getBoundingBox || instance.GetBoundingBox;
      if (typeof direct === "function") {
        try {
          const box = direct.call(instance);
          if (box) {
            return {
              left: box.left,
              top: box.top,
              right: box.right,
              bottom: box.bottom,
            };
          }
        } catch (_) {
        }
      }

      const worldInfo = typeof instance.GetWorldInfo === "function" ? instance.GetWorldInfo() : null;
      const worldInfoBox = worldInfo?.getBoundingBox || worldInfo?.GetBoundingBox;
      if (typeof worldInfoBox === "function") {
        try {
          const box = worldInfoBox.call(worldInfo);
          if (box) {
            return {
              left: box.left,
              top: box.top,
              right: box.right,
              bottom: box.bottom,
            };
          }
        } catch (_) {
        }
      }

      const x = Number(instance.x) || 0;
      const y = Number(instance.y) || 0;
      const width = Math.abs(Number(instance.width) || 0);
      const height = Math.abs(Number(instance.height) || 0);

      return {
        left: x - width / 2,
        top: y - height / 2,
        right: x + width / 2,
        bottom: y + height / 2,
      };
    }

    _getObstacleQuadPoints(instance) {
      if (!instance) {
        return null;
      }

      const readQuad = (quad) => {
        if (!quad) {
          return null;
        }

        const points = [
          { x: Number(quad.p1?.x), y: Number(quad.p1?.y) },
          { x: Number(quad.p2?.x), y: Number(quad.p2?.y) },
          { x: Number(quad.p3?.x), y: Number(quad.p3?.y) },
          { x: Number(quad.p4?.x), y: Number(quad.p4?.y) },
        ];

        if (points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) {
          return points;
        }

        return null;
      };

      const direct = instance.getQuad || instance.GetQuad;
      if (typeof direct === "function") {
        try {
          const points = readQuad(direct.call(instance));
          if (points) {
            return points;
          }
        } catch (_) {
        }
      }

      const worldInfo = typeof instance.GetWorldInfo === "function" ? instance.GetWorldInfo() : null;
      const worldInfoQuad = worldInfo?.getQuad || worldInfo?.GetQuad;
      if (typeof worldInfoQuad === "function") {
        try {
          const points = readQuad(worldInfoQuad.call(worldInfo));
          if (points) {
            return points;
          }
        } catch (_) {
        }
      }

      // Guaranteed fallback: compute an oriented quad from instance transform.
      const x = Number(instance?.x);
      const y = Number(instance?.y);
      const w = Math.abs(Number(instance?.width) || 0);
      const h = Math.abs(Number(instance?.height) || 0);
      const angle = Number(instance?.angle) || 0;
      if (Number.isFinite(x) && Number.isFinite(y) && w > 0 && h > 0) {
        const hx = w * 0.5;
        const hy = h * 0.5;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const corners = [
          { x: -hx, y: -hy },
          { x: hx, y: -hy },
          { x: hx, y: hy },
          { x: -hx, y: hy },
        ];

        return corners.map((p) => ({
          x: x + (p.x * cos) - (p.y * sin),
          y: y + (p.x * sin) + (p.y * cos),
        }));
      }

      return null;
    }

    _boundsIntersect(a, b) {
      return !(
        a.right < b.left ||
        a.left > b.right ||
        a.bottom < b.top ||
        a.top > b.bottom
      );
    }

    _getRadiusAABB() {
      const ox = this._getOriginX();
      const oy = this._getOriginY();
      const radius = this._lightRadius;
      return {
        left: ox - radius,
        top: oy - radius,
        right: ox + radius,
        bottom: oy + radius,
      };
    }

    _getRuntimeObjectTypes(objects) {
      if (!objects) {
        return [];
      }

      if (Array.isArray(objects)) {
        return objects;
      }

      if (typeof objects[Symbol.iterator] === "function") {
        try {
          return Array.from(objects);
        } catch (_) {
        }
      }

      return Object.values(objects);
    }

    _forEachBehaviorEntry(instance, callback) {
      const behaviorBag = instance?.behaviors;
      if (!behaviorBag) {
        return;
      }

      if (Array.isArray(behaviorBag)) {
        for (let i = 0; i < behaviorBag.length; i++) {
          callback(String(i), behaviorBag[i]);
        }
        return;
      }

      if (typeof behaviorBag[Symbol.iterator] === "function") {
        for (const item of behaviorBag) {
          if (Array.isArray(item) && item.length >= 2) {
            callback(String(item[0]), item[1]);
          } else {
            callback("", item);
          }
        }
        return;
      }

      for (const [key, behavior] of Object.entries(behaviorBag)) {
        callback(key, behavior);
      }
    }

    _normalizeBehaviorTypeName(value) {
      return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
    }

    _isBehaviorEnabled(behavior) {
      if (!behavior) {
        return false;
      }
      return behavior.isEnabled !== false && behavior.enabled !== false;
    }

    _getEnabledBehaviorByType(instance, typeName) {
      const behaviorBag = instance?.behaviors;
      if (!behaviorBag) {
        return null;
      }

      const target = this._normalizeBehaviorTypeName(typeName);
      const direct = behaviorBag[typeName] || behaviorBag[target] || behaviorBag.Solid || behaviorBag.solid;
      if (this._isBehaviorEnabled(direct)) {
        return direct;
      }

      let found = null;
      this._forEachBehaviorEntry(instance, (key, behavior) => {
        if (found || !this._isBehaviorEnabled(behavior)) {
          return;
        }

        const keyName = this._normalizeBehaviorTypeName(key);
        const behaviorTypeName = this._normalizeBehaviorTypeName(behavior?.behaviorType?.name);

        if (keyName === target || behaviorTypeName === target) {
          found = behavior;
        }
      });

      return found;
    }

    _instanceHasEnabledBehavior(instance, behaviorName) {
      return !!this._getEnabledBehaviorByType(instance, behaviorName);
    }

    _instanceHasTag(instance, tag) {
      if (!instance || !tag) {
        return false;
      }

      if (typeof instance.hasTag === "function") {
        try {
          return !!instance.hasTag(tag);
        } catch (_) {
        }
      }

      const tags = instance.tags || instance._tags;
      if (tags instanceof Set) {
        return tags.has(tag);
      }

      if (Array.isArray(tags)) {
        return tags.includes(tag);
      }

      return false;
    }

    _collectAllInstances() {
      const runtime = this._getRuntime();
      const allInstances = [];

      if (!runtime?.objects) {
        return allInstances;
      }

      for (const objectType of this._getRuntimeObjectTypes(runtime.objects)) {
        if (!objectType || typeof objectType.getAllInstances !== "function") {
          continue;
        }

        for (const instance of objectType.getAllInstances()) {
          allInstances.push(instance);
        }
      }

      return allInstances;
    }

    _collectTaggedInstances(tag) {
      const runtime = this._getRuntime();
      if (!tag || !runtime) {
        return [];
      }

      if (typeof runtime.getInstancesByTag === "function") {
        try {
          return Array.from(runtime.getInstancesByTag(tag));
        } catch (_) {
        }
      }

      return this._collectAllInstances().filter((instance) => this._instanceHasTag(instance, tag));
    }

    _collectObstacleCandidates() {
      const radiusAABB = this._getRadiusAABB();
      const candidateByUID = new Map();

      const addCandidate = (instance) => {
        if (!instance || instance === this.instance) {
          return;
        }

        const uid = this._getUID(instance);
        if (uid === -1 || candidateByUID.has(uid)) {
          return;
        }

        const bbox = this._getBoundingBox(instance);
        if (!bbox || !this._boundsIntersect(radiusAABB, bbox)) {
          return;
        }

        candidateByUID.set(uid, {
          instance,
          uid,
          bbox,
          points: this._getObstaclePoints(instance, bbox),
        });
      };

      if (this._obstacleMode === "solid_behaviour") {
        for (const instance of this._collectAllInstances()) {
          if (this._instanceHasEnabledBehavior(instance, "Solid")) {
            addCandidate(instance);
          }
        }
      } else if (this._obstacleMode === "custom_objects") {
        for (const objectType of this._obstacleObjectRefs.values()) {
          if (!objectType || typeof objectType.getAllInstances !== "function") {
            continue;
          }

          for (const instance of objectType.getAllInstances()) {
            addCandidate(instance);
          }
        }
      } else {
        for (const tag of this._obstacleTagSet) {
          for (const instance of this._collectTaggedInstances(tag)) {
            addCandidate(instance);
          }
        }
      }

      return Array.from(candidateByUID.values());
    }

    _getFrameForCollisionPoly(instance) {
      const animation = instance?.animation;
      const candidates = [
        animation?.currentFrame,
        typeof animation?.getCurrentFrame === "function" ? animation.getCurrentFrame() : null,
        typeof animation?.GetCurrentFrame === "function" ? animation.GetCurrentFrame() : null,
        typeof instance?.getCurrentImageInfo === "function" ? instance.getCurrentImageInfo() : null,
        typeof instance?.GetCurrentImageInfo === "function" ? instance.GetCurrentImageInfo() : null,
      ];

      for (const frame of candidates) {
        if (!frame) {
          continue;
        }
        const getCount = frame.getPolyPointCount || frame.GetPolyPointCount;
        const getX = frame.getPolyPointX || frame.GetPolyPointX;
        const getY = frame.getPolyPointY || frame.GetPolyPointY;
        if (typeof getCount === "function" && typeof getX === "function" && typeof getY === "function") {
          return frame;
        }
      }

      return null;
    }

    _readFrameOrigin(frame, axis) {
      const key = axis === "x" ? "originX" : "originY";
      const getter = axis === "x"
        ? (frame?.getOriginX || frame?.GetOriginX)
        : (frame?.getOriginY || frame?.GetOriginY);

      const raw = Number(frame?.[key]);
      if (Number.isFinite(raw)) {
        return raw;
      }

      if (typeof getter === "function") {
        try {
          const value = Number(getter.call(frame));
          if (Number.isFinite(value)) {
            return value;
          }
        } catch (_) {
        }
      }

      return 0.5;
    }

    _getObstaclePoints(instance, bbox = this._getBoundingBox(instance)) {
      if (!instance || !bbox) {
        return [];
      }

      const frame = this._getFrameForCollisionPoly(instance);
      const getCount = frame && (frame.getPolyPointCount || frame.GetPolyPointCount);
      const getX = frame && (frame.getPolyPointX || frame.GetPolyPointX);
      const getY = frame && (frame.getPolyPointY || frame.GetPolyPointY);

      let polyCount = 0;
      if (typeof getCount === "function") {
        try {
          polyCount = Number(getCount.call(frame));
        } catch (_) {
          polyCount = 0;
        }
      }

      if (polyCount >= 3 && typeof getX === "function" && typeof getY === "function") {
        const originX = this._readFrameOrigin(frame, "x");
        const originY = this._readFrameOrigin(frame, "y");
        const rawPoints = [];

        for (let index = 0; index < polyCount; index++) {
          let px = 0;
          let py = 0;
          try {
            px = Number(getX.call(frame, index));
            py = Number(getY.call(frame, index));
          } catch (_) {
            continue;
          }

          if (!Number.isFinite(px) || !Number.isFinite(py)) {
            continue;
          }

          rawPoints.push({ x: px, y: py });
        }

        const points = [];
        if (rawPoints.length >= 3) {
          const xs = rawPoints.map((p) => p.x);
          const ys = rawPoints.map((p) => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          // Format A: normalized 0..1 coordinates (common).
          const isNormalized01 = minX >= -0.01 && maxX <= 1.01 && minY >= -0.01 && maxY <= 1.01;
          // Format B: origin-relative normalized coordinates (around -0.5..0.5).
          const isOriginRelative = minX >= -1.01 && maxX <= 1.01 && minY >= -1.01 && maxY <= 1.01 && !isNormalized01;

          for (const p of rawPoints) {
            const localNormX = isNormalized01
              ? (p.x - originX)
              : isOriginRelative
                ? p.x
                : (p.x - originX);
            const localNormY = isNormalized01
              ? (p.y - originY)
              : isOriginRelative
                ? p.y
                : (p.y - originY);

            points.push(this._localPointToWorld(instance, localNormX, localNormY));
          }
        }

        if (points.length >= 3) {
          return points;
        }
      }

      const quadPoints = this._getObstacleQuadPoints(instance);
      if (quadPoints) {
        return quadPoints;
      }

      return [
        { x: bbox.left, y: bbox.top },
        { x: bbox.right, y: bbox.top },
        { x: bbox.right, y: bbox.bottom },
        { x: bbox.left, y: bbox.bottom },
      ];
    }

    _localPointToWorld(instance, localNormX, localNormY) {
      const width = Math.abs(Number(instance?.width) || 0);
      const height = Math.abs(Number(instance?.height) || 0);
      // C3 IWorldInstance.angle is in radians
      const angle = Number(instance?.angle) || 0;
      const localX = localNormX * width;
      const localY = localNormY * height;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      return {
        x: (Number(instance?.x) || 0) + (localX * cos) - (localY * sin),
        y: (Number(instance?.y) || 0) + (localX * sin) + (localY * cos),
      };
    }

    _buildRayAngles(candidates) {
      const centerAngle = this._getFacingAngleDegrees();
      const arc = this._rayArc;
      const rayCount = this._calculateRayCount();
      const isFullCircle = arc >= 360;
      const startAngle = isFullCircle
        ? 0
        : this._normalizeAngle(centerAngle - (arc / 2));
      const angleMap = new Map();

      const addAngle = (angle, isPrimary) => {
        const normalized = this._normalizeAngle(angle);
        if (!isFullCircle && !this._angleWithinArc(normalized, startAngle, arc)) {
          return;
        }

        const key = normalized.toFixed(4);
        const existing = angleMap.get(key);
        if (existing) {
          existing.isPrimary = existing.isPrimary || isPrimary;
          return;
        }

        angleMap.set(key, { angle: normalized, isPrimary });
      };

      if (isFullCircle) {
        const step = 360 / rayCount;
        for (let index = 0; index < rayCount; index++) {
          addAngle(startAngle + (step * index), true);
        }
      } else if (rayCount <= 1) {
        addAngle(centerAngle, true);
      } else {
        const step = arc / (rayCount - 1);
        for (let index = 0; index < rayCount; index++) {
          addAngle(startAngle + (step * index), true);
        }
      }

      const ox = this._getOriginX();
      const oy = this._getOriginY();
      for (const candidate of candidates) {
        for (const point of candidate.points) {
          const angle = this._normalizeAngle(this._radToDeg(Math.atan2(point.y - oy, point.x - ox)));
          addAngle(angle - EPSILON_ANGLE, false);
          addAngle(angle + EPSILON_ANGLE, false);
        }
      }

      return Array.from(angleMap.values()).sort(
        (a, b) => this._angleDistance(a.angle, startAngle) - this._angleDistance(b.angle, startAngle)
      );
    }

    _angleWithinArc(angle, startAngle, arc) {
      if (arc >= 360) {
        return true;
      }

      return this._angleDistance(angle, startAngle) <= arc;
    }

    _segmentRayIntersection(ox, oy, dx, dy, maxDist, x1, y1, x2, y2) {
      const sx = x2 - x1;
      const sy = y2 - y1;
      const determinant = (dx * sy) - (dy * sx);

      if (Math.abs(determinant) < 1e-8) {
        return null;
      }

      const qx = x1 - ox;
      const qy = y1 - oy;
      const rayT = ((qx * sy) - (qy * sx)) / determinant;
      const segU = ((qx * dy) - (qy * dx)) / determinant;

      if (rayT < 0 || rayT > maxDist || segU < 0 || segU > 1) {
        return null;
      }

      return {
        dist: rayT,
        x: ox + (dx * rayT),
        y: oy + (dy * rayT),
      };
    }

    _castRay(angle, candidates) {
      const ox = this._getOriginX();
      const oy = this._getOriginY();
      const radius = this._lightRadius;
      const radians = this._degToRad(angle);
      const dx = Math.cos(radians);
      const dy = Math.sin(radians);
      const result = {
        x: ox + (dx * radius),
        y: oy + (dy * radius),
        angle: this._normalizeAngle(angle),
        dist: radius,
        hitUID: -1,
        hitInstance: null,
        normalX: 0,
        normalY: 0,
      };

      for (const candidate of candidates) {
        const points = candidate.points;
        if (!Array.isArray(points) || points.length < 2) {
          continue;
        }

        for (let index = 0; index < points.length; index++) {
          const current = points[index];
          const next = points[(index + 1) % points.length];
          const hit = this._segmentRayIntersection(
            ox,
            oy,
            dx,
            dy,
            radius,
            current.x,
            current.y,
            next.x,
            next.y
          );

          if (hit && hit.dist < result.dist) {
            result.x = hit.x;
            result.y = hit.y;
            result.dist = hit.dist;
            result.hitUID = candidate.uid;
            result.hitInstance = candidate.instance;
            // Surface normal for the hit segment, oriented toward the ray origin
            const sx = next.x - current.x;
            const sy = next.y - current.y;
            const segLen = Math.sqrt(sx * sx + sy * sy) || 1;
            let nx = -sy / segLen;
            let ny = sx / segLen;
            if (nx * (ox - hit.x) + ny * (oy - hit.y) < 0) { nx = -nx; ny = -ny; }
            result.normalX = nx;
            result.normalY = ny;
          }
        }
      }

      // Reflected endpoint: r = d - 2*(d.n)*n, then extend from hit by remaining distance
      if (result.hitUID !== -1) {
        const dot = dx * result.normalX + dy * result.normalY;
        const rdx = dx - 2 * dot * result.normalX;
        const rdy = dy - 2 * dot * result.normalY;
        const remaining = radius - result.dist;
        result.reflectX = result.x + rdx * remaining;
        result.reflectY = result.y + rdy * remaining;
      } else {
        result.reflectX = result.x;
        result.reflectY = result.y;
      }

      return result;
    }

    _rebuildVisibilityPolygon(candidates) {
      const rays = this._buildRayAngles(candidates);
      const rawPolyPoints = [];

      for (const ray of rays) {
        const hit = this._castRay(ray.angle, candidates);
        rawPolyPoints.push(hit);


      }

      this._polyPoints = rawPolyPoints;
      this._meshPolyPoints = rawPolyPoints;
    }

    _isPointInPolygon(x, y) {
      if (this._polyPoints.length < 3) {
        return false;
      }

      let inside = false;
      for (
        let i = 0, j = this._polyPoints.length - 1;
        i < this._polyPoints.length;
        j = i++
      ) {
        const pi = this._polyPoints[i];
        const pj = this._polyPoints[j];
        const intersects =
          (pi.y > y) !== (pj.y > y) &&
          x < ((pj.x - pi.x) * (y - pi.y)) / ((pj.y - pi.y) || 1e-8) + pi.x;

        if (intersects) {
          inside = !inside;
        }
      }

      return inside;
    }

    _getPolygonPoint(index) {
      index = Math.floor(Number(index));
      if (index < 0 || index >= this._polyPoints.length) {
        return null;
      }

      return this._polyPoints[index];
    }

    _getPolygonArea() {
      if (this._polyPoints.length < 3) {
        return 0;
      }

      let area = 0;
      for (let index = 0; index < this._polyPoints.length; index++) {
        const current = this._polyPoints[index];
        const next = this._polyPoints[(index + 1) % this._polyPoints.length];
        area += (current.x * next.y) - (next.x * current.y);
      }

      return Math.abs(area) * 0.5;
    }

    _resolveMeshApi() {
      if (this._meshApi) {
        return this._meshApi;
      }

      const candidates = [
        this.instance,
        this.instance && typeof this.instance.GetWorldInfo === "function"
          ? this.instance.GetWorldInfo()
          : null,
        this.instance?.worldInfo || null,
        this.instance?._worldInfo || null,
      ];

      for (const target of candidates) {
        if (!target) {
          continue;
        }

        const setPoint = target.setMeshPoint || target.SetMeshPoint;
        if (typeof setPoint !== "function") {
          continue;
        }

        this._meshApi = {
          setPoint: setPoint.bind(target),
        };
        return this._meshApi;
      }

      return null;
    }

    _resolveMeshSizeApi() {
      if (this._meshSizeApi) {
        return this._meshSizeApi;
      }

      const candidates = [
        this.instance,
        this.instance && typeof this.instance.GetWorldInfo === "function"
          ? this.instance.GetWorldInfo()
          : null,
        this.instance?.worldInfo || null,
        this.instance?._worldInfo || null,
      ];

      for (const target of candidates) {
        if (!target) {
          continue;
        }

        const setSize = target.setMeshSize || target.SetMeshSize;
        if (typeof setSize !== "function") {
          continue;
        }

        this._meshSizeApi = setSize.bind(target);
        return this._meshSizeApi;
      }

      return null;
    }

    _resolveMeshCreateApi() {
      if (this._meshCreateApi) {
        return this._meshCreateApi;
      }

      const candidates = [
        this.instance,
        this.instance && typeof this.instance.GetWorldInfo === "function"
          ? this.instance.GetWorldInfo()
          : null,
        this.instance?.worldInfo || null,
        this.instance?._worldInfo || null,
      ];

      for (const target of candidates) {
        if (!target) {
          continue;
        }

        const create = target.createMesh || target.CreateMesh;
        if (typeof create !== "function") {
          continue;
        }

        this._meshCreateApi = create.bind(target);
        return this._meshCreateApi;
      }

      return null;
    }

    _tryCallMeshCreate(createFn, cols, rows) {
      // Different C3 surfaces expose different createMesh signatures.
      const attempts = [
        () => createFn(cols, rows),
        () => createFn({ cols, rows }),
        () => createFn({ columns: cols, rows }),
        () => createFn({ width: cols, height: rows }),
        () => createFn(),
      ];

      for (const attempt of attempts) {
        try {
          attempt();
          return true;
        } catch (_) {
        }
      }

      return false;
    }

    _createMeshGrid(cols, rows) {
      const direct = this.instance && (this.instance.createMesh || this.instance.CreateMesh);
      if (typeof direct === "function") {
        const ok = this._tryCallMeshCreate(direct.bind(this.instance), cols, rows);
        if (ok) {
          return true;
        }
      }

      const create = this._resolveMeshCreateApi();
      if (typeof create !== "function") {
        return false;
      }

      return this._tryCallMeshCreate(create, cols, rows);
    }

    _meshSetPoint(col, row, point) {
      const direct = this.instance && (this.instance.setMeshPoint || this.instance.SetMeshPoint);
      if (typeof direct === "function") {
        try {
          direct.call(this.instance, col, row, point);
          this._meshWriteOkCount++;
          return true;
        } catch (_) {
        }
      }

      const api = this._resolveMeshApi();
      if (!api) {
        return false;
      }

      try {
        api.setPoint(col, row, point);
        return true;
      } catch (_) {
      }

      try {
        api.setPoint(col, row, point.x, point.y, point.mode || "absolute");
        return true;
      } catch (_) {
      }

      try {
        api.setPoint(col, row, point.x, point.y);
        return true;
      } catch (_) {
        return false;
      }
    }

    _readMeshDimensionsFrom(target) {
      if (!target) {
        return null;
      }

      const cols = Number(target.meshCols ?? target._meshCols ?? target.meshcolumns ?? target.meshColumns);
      const rows = Number(target.meshRows ?? target._meshRows ?? target.meshrows ?? target.meshRowsCount);
      if (Number.isFinite(cols) && Number.isFinite(rows) && cols > 0 && rows > 0) {
        return {
          cols: Math.floor(cols),
          rows: Math.floor(rows),
        };
      }

      return null;
    }

    _refreshMeshDimensions() {
      const candidates = [
        this.instance,
        this.instance && typeof this.instance.GetWorldInfo === "function"
          ? this.instance.GetWorldInfo()
          : null,
        this.instance?.worldInfo || null,
        this.instance?._worldInfo || null,
      ];

      for (const target of candidates) {
        const dims = this._readMeshDimensionsFrom(target);
        if (dims) {
          this._meshCols = dims.cols;
          this._meshRows = dims.rows;
          this._meshReady = dims.cols > 0 && dims.rows > 0;
          return this._meshReady;
        }
      }

      if (this._meshCols > 0 && this._meshRows > 0) {
        this._meshReady = true;
        return true;
      }

      this._meshCols = 0;
      this._meshRows = 0;
      this._meshReady = false;
      return false;
    }

    _ensureMeshDimensions(minCols = this._calculateRayCount(), minRows = 2) {
      const targetCols = Math.max(8, Math.ceil(Number(minCols) || 8));
      const targetRows = Math.max(2, Math.ceil(Number(minRows) || 2));

      if (this._refreshMeshDimensions() && this._meshCols >= targetCols && this._meshRows >= targetRows) {
        return true;
      }

      const setSize = this._resolveMeshSizeApi();
      if (!setSize) {
        if (!this._createMeshGrid(targetCols, targetRows)) {
          if (this._adoptExistingMeshDimensions(targetCols, targetRows)) {
            return true;
          }
          return this._refreshMeshDimensions();
        }
      }

      let resized = false;
      if (setSize) {
        try {
          setSize(targetCols, targetRows);
          resized = true;
        } catch (_) {
        }
      }

      if (!resized) {
        if (this._createMeshGrid(targetCols, targetRows)) {
          resized = true;
        }

        if (!resized) {
          if (this._adoptExistingMeshDimensions(targetCols, targetRows)) {
            return true;
          }
          return this._refreshMeshDimensions();
        }
      }

      // Some C3 builds do not expose readable mesh size fields after SetMeshSize.
      if (!this._adoptExistingMeshDimensions(targetCols, targetRows)) {
        this._meshCols = targetCols;
        this._meshRows = targetRows;
        this._meshReady = true;
      }

      this._refreshMeshDimensions();
      return this._meshReady;
    }

    _probeMeshGrid(cols, rows) {
      if (cols < 2 || rows < 2) {
        return false;
      }

      const okTopLeft = this._meshSetPoint(0, 0, {
        mode: "absolute",
        x: 0,
        y: 0,
        u: 0,
        v: 0,
      });
      if (!okTopLeft) {
        return false;
      }

      const okBottomRight = this._meshSetPoint(cols - 1, rows - 1, {
        mode: "absolute",
        x: 1,
        y: 1,
        u: 1,
        v: 1,
      });

      return okBottomRight;
    }

    _adoptExistingMeshDimensions(preferredCols, preferredRows) {
      const colsCandidates = [
        Math.max(8, Math.floor(preferredCols) || 8),
        256,
        128,
        96,
        64,
        48,
        32,
        24,
        16,
        12,
        8,
      ];
      const rowsCandidates = [
        Math.max(2, Math.floor(preferredRows) || 2),
        4,
        3,
        2,
      ];

      for (const cols of colsCandidates) {
        for (const rows of rowsCandidates) {
          if (!this._probeMeshGrid(cols, rows)) {
            continue;
          }

          this._meshCols = cols;
          this._meshRows = rows;
          this._meshReady = true;
          return true;
        }
      }

      return false;
    }

    _resetMeshSurface() {
      if (!this._ensureMeshDimensions(this._calculateRayCount(), 2)) {
        return false;
      }

      for (let row = 0; row < this._meshRows; row++) {
        const normY = this._meshRows <= 1 ? 0.5 : row / (this._meshRows - 1);
        for (let col = 0; col < this._meshCols; col++) {
          const normX = this._meshCols <= 1 ? 0.5 : col / (this._meshCols - 1);
          this._meshSetPoint(col, row, {
            mode: "absolute",
            x: normX,
            y: normY,
            u: normX,
            v: normY,
          });
        }
      }

      return true;
    }

    _worldToHostMeshPoint(x, y) {
      const ox = this._getOriginX();
      const oy = this._getOriginY();
      const { width, height } = this._getHostSize();
      const angle = this._getInstanceAngleRadians();
      const dx = x - ox;
      const dy = y - oy;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const localX = (dx * cos) + (dy * sin);
      const localY = (-dx * sin) + (dy * cos);

      return {
        x: 0.5 + (localX / width),
        y: 0.5 + (localY / height),
      };
    }

    _interpolatePolyPoints(a, b, t) {
      const frac = this._clamp(Number(t), 0, 1, 0);
      return {
        ...a,
        x: a.x + ((b.x - a.x) * frac),
        y: a.y + ((b.y - a.y) * frac),
      };
    }

    _samplePolygonPointByAngle(t, isFullCircle, points = this._polyPoints) {
      const count = points.length;
      if (count <= 0) {
        return null;
      }
      if (count === 1) {
        return points[0];
      }

      // Full circle keeps a seam wrap and interpolates over all segments.
      if (isFullCircle) {
        const scaled = t * count;
        const i0 = Math.floor(scaled) % count;
        const i1 = (i0 + 1) % count;
        const frac = scaled - Math.floor(scaled);
        return this._interpolatePolyPoints(points[i0], points[i1], frac);
      }

      // Sample by angular position to avoid bending artifacts at sparse/clustered indices.
      const first = points[0];
      const last = points[count - 1];
      const totalSpan = this._angleDistance(last.angle, first.angle);
      if (totalSpan <= 1e-6) {
        const scaled = t * (count - 1);
        const i0 = Math.floor(scaled);
        const i1 = Math.min(count - 1, i0 + 1);
        const frac = scaled - i0;
        return this._interpolatePolyPoints(points[i0], points[i1], frac);
      }

      const clampedT = this._clamp(Number(t), 0, 1, 0);
      const startAngle = first.angle;
      const targetAngle = this._normalizeAngle(startAngle + (totalSpan * clampedT));
      const targetDist = this._angleDistance(targetAngle, startAngle);

      let prev = points[0];
      let prevDist = 0;
      for (let i = 1; i < count; i++) {
        const next = points[i];
        const nextDist = this._angleDistance(next.angle, startAngle);
        if (targetDist <= nextDist) {
          const span = Math.max(1e-8, nextDist - prevDist);
          const frac = (targetDist - prevDist) / span;
          return this._interpolatePolyPoints(prev, next, frac);
        }
        prev = next;
        prevDist = nextDist;
      }

      return points[count - 1];
    }

    _samplePolygonPointByIndex(t, isFullCircle, points = this._polyPoints) {
      const count = points.length;
      if (count <= 0) {
        return null;
      }
      if (count === 1) {
        return points[0];
      }

      const clampedT = this._clamp(Number(t), 0, 1, 0);
      if (isFullCircle) {
        const scaled = clampedT * count;
        const index = Math.floor(scaled) % count;
        return points[index];
      }

      const index = Math.round(clampedT * (count - 1));
      return points[this._clamp(index, 0, count - 1, 0)];
    }

    _getMeshSampleAngle(col, boundaryCols, isFullCircle) {
      const centerAngle = this._getFacingAngleDegrees();
      if (boundaryCols <= 1) {
        return isFullCircle ? 0 : centerAngle;
      }

      const t = this._clamp(col / (boundaryCols - 1), 0, 1, 0);
      if (isFullCircle) {
        const startAngle = 0;
        return this._normalizeAngle(startAngle + (360 * t));
      }

      const startAngle = this._normalizeAngle(centerAngle - (this._rayArc / 2));
      return this._normalizeAngle(startAngle + (this._rayArc * t));
    }

    _writePolygonToMesh() {
      this._ensureHostCoverageForRange();
      const meshPoints = this._polyPoints;

      if (!this._ensureMeshDimensions(meshPoints.length || this._calculateRayCount(), 2)) {
        if (!this._meshNotReadyReported) {
          this._meshNotReadyReported = true;
          this._trigger("OnMeshNotReady");
        }
        return;
      }

      this._meshNotReadyReported = false;
      if (!meshPoints.length) {
        return;
      }

      const boundaryCols = this._meshCols;
      if (boundaryCols <= 0) {
        return;
      }

      const isFullCircle = this._rayArc >= 360;

      for (let col = 0; col < boundaryCols; col++) {
        let sample = null;
        if (boundaryCols <= 1) {
          sample = meshPoints[0];
        } else if (isFullCircle && col === boundaryCols - 1) {
          // Close the 360-degree seam by forcing the last edge vertex to match the first.
          sample = meshPoints[0];
        } else {
          const t = col / (boundaryCols - 1);
          sample = this._samplePolygonPointByIndex(t, isFullCircle, meshPoints);
        }

        if (!sample) {
          continue;
        }

        const meshPoint = this._worldToHostMeshPoint(sample.x, sample.y);

        this._meshSetPoint(col, 0, {
          mode: "absolute",
          x: this._clamp(meshPoint.x, -0.25, 1.25, meshPoint.x),
          y: this._clamp(meshPoint.y, -0.25, 1.25, meshPoint.y),
          u: boundaryCols <= 1 ? 0.5 : col / (boundaryCols - 1),
          v: 0,
        });
      }

      for (let row = 1; row < this._meshRows; row++) {
        for (let col = 0; col < boundaryCols; col++) {
          const normX = boundaryCols <= 1 ? 0.5 : col / (boundaryCols - 1);
          const normY = this._meshRows <= 1 ? 0.5 : row / (this._meshRows - 1);
          this._meshSetPoint(col, row, {
            mode: "absolute",
            x: this._pinNormX,
            y: this._pinNormY,
            u: normX,
            v: normY,
          });
        }
      }
    }

    GetPolyData() {
      return this._polyPoints;
    }

    GetOriginX() {
      return this._getOriginX();
    }

    GetOriginY() {
      return this._getOriginY();
    }

    GetLightRadius() {
      return this._lightRadius;
    }

    GetLightAngle() {
      return this._getInstanceAngleRadians();
    }

    GetPinNormX() {
      return this._pinNormX;
    }

    GetPinNormY() {
      return this._pinNormY;
    }

    _getObstacleMode() {
      return this._obstacleMode;
    }

    _setObstacleMode(mode) {
      const nextMode = typeof mode === "string" ? mode : this._combo(mode, OBSTACLE_MODES);
      this._obstacleMode = OBSTACLE_MODES.includes(nextMode) ? nextMode : this._obstacleMode;
      this._trigger("OnObstacleModeChanged");
    }

    _resolveObjectTypeName(objectType) {
      // IObjectClass.name is stable and always available on C3 runtime object types
      if (!objectType) return null;
      return typeof objectType.name === "string" && objectType.name ? objectType.name : null;
    }

    _addObstacleObject(objectType) {
      const name = this._resolveObjectTypeName(objectType);
      if (!name) return;
      this._obstacleObjectRefs.set(name, objectType);
    }

    _removeObstacleObject(objectType) {
      const name = this._resolveObjectTypeName(objectType);
      if (!name) return;
      this._obstacleObjectRefs.delete(name);
    }

    _clearObstacleObjects() {
      this._obstacleObjectRefs.clear();
    }

    _setObstacleTag(tag) {
      const tags = this._parseTagList(tag);
      this._primaryObstacleTag = tags[0] || "";
      this._obstacleTagSet = new Set(tags);

      if (this._obstacleMode === "tag") {
        this._trigger("OnObstacleTagChanged");
      }
    }

    _addObstacleTag(tag) {
      const nextTags = this._parseTagList(tag);
      for (const nextTag of nextTags) {
        this._obstacleTagSet.add(nextTag);
        if (!this._primaryObstacleTag) {
          this._primaryObstacleTag = nextTag;
        }
      }
    }

    _removeObstacleTag(tag) {
      const tagsToRemove = this._parseTagList(tag);
      if (!tagsToRemove.length) {
        return;
      }

      for (const nextTag of tagsToRemove) {
        this._obstacleTagSet.delete(nextTag);
      }

      if (!this._obstacleTagSet.has(this._primaryObstacleTag)) {
        const fallbackTag = this._obstacleTagSet.values().next().value;
        this._primaryObstacleTag = fallbackTag || "";
      }
    }

    _setRange(radius) {
      this._lightRadius = Math.max(0, Number(radius) || 0);
    }

    _setConeOfView(arc) {
      this._rayArc = this._clamp(Number(arc) || this._rayArc, 1, 360);
    }

    _setRayDensity(density) {
      // density is 0-1 (percent property convention)
      this._rayDensity = this._clamp(Number(density) || this._rayDensity, 0.01, 1);
    }

    _enableMeshDeform() {
      this._meshDeformEnabled = true;
    }

    _disableMeshDeform() {
      this._meshDeformEnabled = false;
    }

    _resetMesh() {
      this._resetMeshSurface();
      this._meshDeformEnabled = false;
    }

    _setMeshPinOrigin(x, y) {
      this._pinNormX = this._clamp(Number(x), 0, 1, this._pinNormX);
      this._pinNormY = this._clamp(Number(y), 0, 1, this._pinNormY);
    }

    _isBatchRendered() {
      return false;
    }



    _isMeshDeformEnabled() {
      return this._meshDeformEnabled;
    }

    _setEnabled(value) {
      this._enabled = !!value;
    }

    _isEnabled() {
      return this._enabled;
    }

    _isObstacleModeActive(mode) {
      const target = typeof mode === "string" ? mode : this._combo(mode, OBSTACLE_MODES);
      return this._obstacleMode === target;
    }

    _hasObstacleTag(tag) {
      const normalizedTag = String(tag || "").trim();
      return this._obstacleMode === "tag" && this._obstacleTagSet.has(normalizedTag);
    }

    _hasObstacleObject(objectType) {
      if (this._obstacleMode !== "custom_objects") return false;
      const name = this._resolveObjectTypeName(objectType);
      return name !== null && this._obstacleObjectRefs.has(name);
    }

    _isPointInVisibility(x, y) {
      return this._isPointInPolygon(Number(x) || 0, Number(y) || 0);
    }

    _countPolyPoints() {
      return this._polyPoints.length;
    }

    _getPolyPointX(index) {
      return this._getPolygonPoint(index)?.x ?? 0;
    }

    _getPolyPointY(index) {
      return this._getPolygonPoint(index)?.y ?? 0;
    }

    _getPolyPointAngle(index) {
      return this._getPolygonPoint(index)?.angle ?? 0;
    }

    _getPolyPointDist(index) {
      return this._getPolygonPoint(index)?.dist ?? 0;
    }

    _getPolyHitUID(index) {
      return this._getPolygonPoint(index)?.hitUID ?? -1;
    }

    _getPolygonAreaExpression() {
      return this._getPolygonArea();
    }



    _getBatcherUID() {
      return -1;
    }

    _getActiveObstacleMode() {
      return this._obstacleMode;
    }

    _getActiveObstacleTag() {
      return this._obstacleMode === "tag" ? this._primaryObstacleTag : "";
    }

    _countObstacleObjects() {
      return this._obstacleMode === "custom_objects" ? this._obstacleObjectRefs.size : 0;
    }

    _calculateRayCount() {
      return Math.max(8, Math.ceil(this._rayArc * this._rayDensity));
    }

    _getActiveRange() {
      return this._lightRadius;
    }

    _getActiveConeOfView() {
      return this._rayArc;
    }

    _getLastPolygonUpdateTime() {
      return this._lastPolygonUpdateTime;
    }

    _getDebuggerProperties() {
      const tags = Array.from(this._obstacleTagSet).join(", ");

      return [
        {
          title: `$${this.behaviorType.name}`,
          properties: [
            { name: "$enabled", value: this._enabled, onedit: v => { this._setEnabled(v === "true" || v === true); } },
            { name: "$mode", value: this._obstacleMode },
            { name: "$radius", value: this._lightRadius, onedit: v => { this._setRange(+v); } },
            { name: "$cone", value: this._rayArc, onedit: v => { this._setConeOfView(+v); } },
            { name: "$rayCount", value: this._calculateRayCount() },
            { name: "$polyPoints", value: this._polyPoints.length },
            { name: "$tags", value: tags },
          ],
        },
      ];
    }
  };
}
