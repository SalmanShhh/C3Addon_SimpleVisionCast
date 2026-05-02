import { id, addonType } from "../../config.caw.js";
import AddonTypeMap from "../../template/addonTypeMap.js";

const OBSTACLE_MODES = ["solid_behaviour", "custom_objects", "tag"];
const CULL_MODES = ["radius_aabb", "none"];
const EPSILON_ANGLE = 0.001;

export default function (parentClass) {
  return class extends parentClass {
    constructor() {
      super();
      const properties = this._getInitProperties() || [];

      this.events = {};

      this._batcherHandshake = properties[0] !== undefined ? !!properties[0] : true;
      this._obstacleMode = this._combo(properties[1], OBSTACLE_MODES);
      this._initialObstacleObjectSid = this._coerceSid(properties[2]);
      this._primaryObstacleTag = typeof properties[3] === "string" ? properties[3] : "wall";
      this._detectionTag = typeof properties[4] === "string" ? properties[4] : "";
      this._lightRadius = Math.max(0, Number(properties[5]) || 300);
      this._rayArc = this._clamp(Number(properties[6]) || 360, 1, 360);
      this._rayCount = Math.max(8, Math.floor(Number(properties[7]) || 64));
      this._facingAngle = Number(properties[8]) || 0;
      this._meshDeformEnabled = properties[9] !== undefined ? !!properties[9] : true;
      this._detectionInterval = Math.max(0, Number(properties[10]) || 0);
      this._cullMode = this._combo(properties[11], CULL_MODES);
      this._debugOverlay = properties[12] !== undefined ? !!properties[12] : false;

      this._obstacleTagSet = new Set();
      if (this._primaryObstacleTag) {
        this._obstacleTagSet.add(this._primaryObstacleTag);
      }

      // obstacle objects tracked by display name (stable across save/load)
      this._obstacleObjectRefs = new Map();

      this._polyPoints = [];
      this._visibleSet = new Set();
      this._visibleList = [];
      this._candidateCache = [];

      this._pinNormX = 0.5;
      this._pinNormY = 0.5;

      this._claimedByUID = -1;
      this._batchSuppressMesh = false;

      this._currentEntrant = -1;
      this._currentExitant = -1;
      this._currentRayHit = {
        uid: -1,
        x: 0,
        y: 0,
        angle: 0,
        instance: null,
      };

      this._meshApi = null;
      this._meshCols = 0;
      this._meshRows = 0;
      this._meshReady = false;
      this._meshNotReadyReported = false;

      this._detectionTimer = 0;
      this._needsDetectionSweep = true;
      this._lastPolygonUpdateTime = 0;
      this._lastRaycastMs = 0;
      this._obstacleCandidateCount = 0;

      this._setTicking(true);
    }

    onCreate() {
      if (this._initialObstacleObjectSid !== -1) {
        const objectType = this._getObjectTypeBySid(this._initialObstacleObjectSid);
        if (objectType) {
          const name = this._resolveObjectTypeName(objectType);
          if (name) this._obstacleObjectRefs.set(name, objectType);
        }
      }

      this._refreshMeshDimensions();
    }

    _tick() {
      const raycastStart = performance.now();
      const candidates = this._collectObstacleCandidates();
      this._candidateCache = candidates;
      this._obstacleCandidateCount = candidates.length;
      this._rebuildVisibilityPolygon(candidates);
      this._lastRaycastMs = performance.now() - raycastStart;
      this._lastPolygonUpdateTime = this._getRuntimeTime();

      this._trigger("OnPolygonUpdated");

      if (this._meshDeformEnabled && !this._batchSuppressMesh) {
        this._writePolygonToMesh();
      }

      this._detectionTimer += this._getDeltaTime();
      if (
        this._needsDetectionSweep ||
        this._detectionInterval === 0 ||
        this._detectionTimer >= this._detectionInterval
      ) {
        this._runDetectionSweep();
        this._detectionTimer = 0;
        this._needsDetectionSweep = false;
      }
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
        detectionTag: this._detectionTag,
        lightRadius: this._lightRadius,
        rayArc: this._rayArc,
        rayCount: this._rayCount,
        facingAngle: this._facingAngle,
        meshDeformEnabled: this._meshDeformEnabled,
        detectionInterval: this._detectionInterval,
        cullMode: this._cullMode,
        batcherHandshake: this._batcherHandshake,
        pinNormX: this._pinNormX,
        pinNormY: this._pinNormY,
        claimedByUID: this._claimedByUID,
        batchSuppressMesh: this._batchSuppressMesh,
      };
    }

    _loadFromJson(o) {
      this._obstacleMode = OBSTACLE_MODES.includes(o?.obstacleMode)
        ? o.obstacleMode
        : this._obstacleMode;
      this._obstacleTagSet = new Set(Array.isArray(o?.obstacleTags) ? o.obstacleTags : []);
      this._primaryObstacleTag = typeof o?.primaryObstacleTag === "string"
        ? o.primaryObstacleTag
        : this._primaryObstacleTag;
      if (this._primaryObstacleTag) {
        this._obstacleTagSet.add(this._primaryObstacleTag);
      }
      this._detectionTag = typeof o?.detectionTag === "string" ? o.detectionTag : this._detectionTag;
      this._lightRadius = Math.max(0, Number(o?.lightRadius) || this._lightRadius);
      this._rayArc = this._clamp(Number(o?.rayArc) || this._rayArc, 1, 360);
      this._rayCount = Math.max(8, Math.floor(Number(o?.rayCount) || this._rayCount));
      this._facingAngle = Number(o?.facingAngle) || this._facingAngle;
      this._meshDeformEnabled = o?.meshDeformEnabled !== undefined
        ? !!o.meshDeformEnabled
        : this._meshDeformEnabled;
      this._detectionInterval = Math.max(
        0,
        Number(o?.detectionInterval) || this._detectionInterval
      );
      this._cullMode = CULL_MODES.includes(o?.cullMode) ? o.cullMode : this._cullMode;
      this._batcherHandshake = o?.batcherHandshake !== undefined
        ? !!o.batcherHandshake
        : this._batcherHandshake;
      this._pinNormX = this._clamp(Number(o?.pinNormX), 0, 1, this._pinNormX);
      this._pinNormY = this._clamp(Number(o?.pinNormY), 0, 1, this._pinNormY);
      this._claimedByUID = Number.isFinite(Number(o?.claimedByUID))
        ? Number(o.claimedByUID)
        : -1;
      this._batchSuppressMesh = o?.batchSuppressMesh !== undefined
        ? !!o.batchSuppressMesh
        : false;

      this._visibleSet.clear();
      this._visibleList = [];
      this._needsDetectionSweep = true;
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

    _coerceSid(value) {
      const sid = Number(value);
      return Number.isFinite(sid) && sid >= 0 ? sid : -1;
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

    _getDeltaTime() {
      return this._getRuntime()?.dt || 0;
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
      return this._normalizeAngle(this._radToDeg(this._getInstanceAngleRadians()) + this._facingAngle);
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

    _getObjectTypeBySid(sid) {
      const runtime = this._getRuntime();
      if (!runtime || sid === -1) {
        return null;
      }

      if (typeof runtime.getObjectClassBySid === "function") {
        return runtime.getObjectClassBySid(sid);
      }

      if (runtime.objects) {
        for (const objectType of runtime.objects) {
          if (Number(objectType?.sid) === sid || Number(objectType?._sid) === sid) {
            return objectType;
          }
        }
      }

      return null;
    }

    _instanceHasEnabledBehavior(instance, behaviorName) {
      if (!instance?.behaviors) {
        return false;
      }

      for (const behavior of Object.values(instance.behaviors)) {
        if (behavior?.behaviorType?.name === behaviorName && behavior.isEnabled !== false) {
          return true;
        }
      }

      return false;
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

      for (const objectType of runtime.objects) {
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
        if (!bbox) {
          return;
        }

        if (this._cullMode === "radius_aabb" && !this._boundsIntersect(radiusAABB, bbox)) {
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

    _getObstaclePoints(instance, bbox = this._getBoundingBox(instance)) {
      if (!instance || !bbox) {
        return [];
      }

      const frame = instance.animation?.currentFrame;
      const polyCount = frame && typeof frame.getPolyPointCount === "function"
        ? Number(frame.getPolyPointCount())
        : 0;

      if (polyCount >= 3) {
        const points = [];
        for (let index = 0; index < polyCount; index++) {
          points.push(
            this._localPointToWorld(
              instance,
              Number(frame.getPolyPointX(index)) - 0.5,
              Number(frame.getPolyPointY(index)) - 0.5
            )
          );
        }
        return points;
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
      const isFullCircle = arc >= 360;
      const startAngle = this._normalizeAngle(centerAngle - (arc / 2));
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
        const step = 360 / this._rayCount;
        for (let index = 0; index < this._rayCount; index++) {
          addAngle(startAngle + (step * index), true);
        }
      } else if (this._rayCount <= 1) {
        addAngle(centerAngle, true);
      } else {
        const step = arc / (this._rayCount - 1);
        for (let index = 0; index < this._rayCount; index++) {
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
          }
        }
      }

      return result;
    }

    _rebuildVisibilityPolygon(candidates) {
      const rays = this._buildRayAngles(candidates);
      const polyPoints = [];

      for (const ray of rays) {
        const hit = this._castRay(ray.angle, candidates);
        polyPoints.push(hit);

        if (ray.isPrimary && hit.hitUID !== -1) {
          this._currentRayHit.uid = hit.hitUID;
          this._currentRayHit.x = hit.x;
          this._currentRayHit.y = hit.y;
          this._currentRayHit.angle = hit.angle;
          this._currentRayHit.instance = hit.hitInstance;
          this._trigger("OnRayHit");
        }
      }

      this._polyPoints = polyPoints;
    }

    _runDetectionSweep() {
      if (!this._detectionTag) {
        this._visibleSet.clear();
        this._visibleList = [];
        return;
      }

      const previousVisible = new Set(this._visibleSet);
      const nextVisible = new Set();
      const nextVisibleList = [];
      const candidates = this._collectTaggedInstances(this._detectionTag);

      for (const instance of candidates) {
        const uid = this._getUID(instance);
        if (uid === -1) {
          continue;
        }

        if (this._isPointInPolygon(Number(instance.x) || 0, Number(instance.y) || 0)) {
          nextVisible.add(uid);
          nextVisibleList.push(uid);

          if (!previousVisible.has(uid)) {
            this._currentEntrant = uid;
            this._trigger("OnObjectEnterLoS");
          }
        }
      }

      for (const uid of previousVisible) {
        if (!nextVisible.has(uid)) {
          this._currentExitant = uid;
          this._trigger("OnObjectExitLoS");
        }
      }

      this._visibleSet = nextVisible;
      this._visibleList = nextVisibleList;
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

    _meshSetPoint(col, row, point) {
      const direct = this.instance && (this.instance.setMeshPoint || this.instance.SetMeshPoint);
      if (typeof direct === "function") {
        try {
          direct.call(this.instance, col, row, point);
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

      this._meshCols = 0;
      this._meshRows = 0;
      this._meshReady = false;
      return false;
    }

    _resetMeshSurface() {
      if (!this._refreshMeshDimensions()) {
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

    _writePolygonToMesh() {
      if (!this._refreshMeshDimensions()) {
        if (!this._meshNotReadyReported) {
          this._meshNotReadyReported = true;
          this._trigger("OnMeshNotReady");
        }
        return;
      }

      this._meshNotReadyReported = false;
      if (!this._polyPoints.length) {
        return;
      }

      const boundaryCols = this._meshCols;
      if (boundaryCols <= 0) {
        return;
      }

      for (let col = 0; col < boundaryCols; col++) {
        const sampleIndex = boundaryCols <= 1
          ? 0
          : Math.round((col / (boundaryCols - 1)) * (this._polyPoints.length - 1));
        const sample = this._polyPoints[sampleIndex];
        const meshPoint = this._worldToHostMeshPoint(sample.x, sample.y);
        this._meshSetPoint(col, 0, {
          mode: "absolute",
          x: meshPoint.x,
          y: meshPoint.y,
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

    IsBatchHandshakeEnabled() {
      return this._batcherHandshake;
    }

    ClaimForBatch(batcherUID) {
      if (!this._batcherHandshake || this._claimedByUID !== -1) {
        return;
      }

      this._claimedByUID = Number.isFinite(Number(batcherUID)) ? Number(batcherUID) : -1;
      this._batchSuppressMesh = true;
      this._trigger("OnBatcherAttached");
    }

    ReleaseFromBatch() {
      if (this._claimedByUID === -1 && !this._batchSuppressMesh) {
        return;
      }

      this._claimedByUID = -1;
      this._batchSuppressMesh = false;
      this._trigger("OnBatcherDetached");
    }

    _getObstacleMode() {
      return this._obstacleMode;
    }

    _setObstacleMode(mode) {
      const nextMode = typeof mode === "string" ? mode : this._combo(mode, OBSTACLE_MODES);
      this._obstacleMode = OBSTACLE_MODES.includes(nextMode) ? nextMode : this._obstacleMode;
      this._trigger("OnObstacleModeChanged");
    }

    _setCullMode(mode) {
      const nextMode = typeof mode === "string" ? mode : this._combo(mode, CULL_MODES);
      this._cullMode = CULL_MODES.includes(nextMode) ? nextMode : this._cullMode;
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
      this._primaryObstacleTag = String(tag || "");
      this._obstacleTagSet = new Set();
      if (this._primaryObstacleTag) {
        this._obstacleTagSet.add(this._primaryObstacleTag);
      }

      if (this._obstacleMode === "tag") {
        this._trigger("OnObstacleTagChanged");
      }
    }

    _addObstacleTag(tag) {
      const nextTag = String(tag || "");
      if (nextTag) {
        this._obstacleTagSet.add(nextTag);
      }
    }

    _removeObstacleTag(tag) {
      const nextTag = String(tag || "");
      if (!nextTag) {
        return;
      }

      if (nextTag === this._primaryObstacleTag) {
        this._primaryObstacleTag = "";
      }
      this._obstacleTagSet.delete(nextTag);
    }

    _setDetectionTag(tag) {
      this._detectionTag = String(tag || "");
      this._needsDetectionSweep = true;
    }

    _setLightRadius(radius) {
      this._lightRadius = Math.max(0, Number(radius) || 0);
      this._needsDetectionSweep = true;
    }

    _setRayArc(arc) {
      this._rayArc = this._clamp(Number(arc) || this._rayArc, 1, 360, this._rayArc);
      this._needsDetectionSweep = true;
    }

    _setRayCount(count) {
      this._rayCount = Math.max(8, Math.floor(Number(count) || this._rayCount));
      this._needsDetectionSweep = true;
    }

    _setFacingAngle(angle) {
      this._facingAngle = Number(angle) || 0;
      this._needsDetectionSweep = true;
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

    _forceDetectionSweep() {
      this._needsDetectionSweep = true;
      this._runDetectionSweep();
      this._detectionTimer = 0;
      this._needsDetectionSweep = false;
    }

    _clearDetectedObjects() {
      this._visibleSet.clear();
      this._visibleList = [];
    }

    _isBatchRendered() {
      return this._claimedByUID !== -1;
    }

    _isObjectInLoS(uid) {
      return this._visibleSet.has(Math.floor(Number(uid)));
    }

    _isMeshDeformEnabled() {
      return this._meshDeformEnabled;
    }

    _isObstacleModeActive(mode) {
      const target = typeof mode === "string" ? mode : this._combo(mode, OBSTACLE_MODES);
      return this._obstacleMode === target;
    }

    _hasObstacleTag(tag) {
      return this._obstacleMode === "tag" && this._obstacleTagSet.has(String(tag || ""));
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

    _getLoSEntrantUID() {
      return this._currentEntrant;
    }

    _getLoSExitantUID() {
      return this._currentExitant;
    }

    _countVisibleObjects() {
      return this._visibleList.length;
    }

    _getVisibleObjectUID(index) {
      index = Math.floor(Number(index));
      return this._visibleList[index] ?? -1;
    }

    _getRayHitUID() {
      return this._currentRayHit.uid;
    }

    _getRayHitX() {
      return this._currentRayHit.x;
    }

    _getRayHitY() {
      return this._currentRayHit.y;
    }

    _getRayHitAngle() {
      return this._currentRayHit.angle;
    }

    _getBatcherUID() {
      return this._claimedByUID;
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

    _getActiveLightRadius() {
      return this._lightRadius;
    }

    _getActiveRayArc() {
      return this._rayArc;
    }

    _getActiveFacingAngle() {
      return this._facingAngle;
    }

    _getLastPolygonUpdateTime() {
      return this._lastPolygonUpdateTime;
    }

    _getDebuggerProperties() {
      return [
        {
          title: `$${this.behaviorType.name}`,
          properties: [
            { name: "$obstacleMode", value: this._obstacleMode },
            { name: "$polyPointCount", value: this._polyPoints.length },
            { name: "$obstacleCandidateCount", value: this._obstacleCandidateCount },
            { name: "$visibleObjectCount", value: this._visibleList.length },
            { name: "$activeTags", value: Array.from(this._obstacleTagSet).join(", ") },
            { name: "$lastRaycastMs", value: this._lastRaycastMs },
          ],
        },
      ];
    }
  };
}
