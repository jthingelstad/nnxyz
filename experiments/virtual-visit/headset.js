import * as T from 'three';

// Windows and immersive sessions share one building. WebXR supplies the viewer's
// eye height and head pose; the rig supplies only the visitor's place in the plan.
export function makeHeadset(renderer, scene, shell, actions) {
  const rig = new T.Group(),
    camera = new T.PerspectiveCamera(62, 1, 0.055, 135);
  rig.add(camera);
  scene.add(rig);
  const rays = new T.Raycaster(),
    dir = new T.Vector3(),
    pos = new T.Vector3(),
    tracked = new T.Vector3();
  const controllers = [],
    sticks = new Set();
  let session,
    lastX = Infinity,
    lastZ = Infinity;
  const head = () => camera.getWorldPosition(tracked);
  function at(x, z) {
    const h = head();
    rig.position.x += x - h.x;
    rig.position.z += z - h.z;
    rig.updateMatrixWorld(true);
    actions.moved(x, z);
    lastX = x;
    lastZ = z;
  }
  function intersect(c) {
    c.getWorldPosition(pos);
    c.getWorldDirection(dir).negate();
    rays.set(pos, dir);
    rays.far = 18;
    return rays.intersectObject(shell(), true)[0];
  }
  function setup() {
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i);
      const geom = new T.BufferGeometry().setFromPoints([
        new T.Vector3(),
        new T.Vector3(0, 0, -1),
      ]);
      const line = new T.Line(
        geom,
        new T.LineBasicMaterial({ color: 0x57819c }),
      );
      c.add(line);
      rig.add(c);
      controllers.push({ c, line });
      c.addEventListener('select', () => {
        const hit = intersect(c);
        if (!hit) return;
        const d = hit.object.userData;
        if (d.ground && actions.allowed(hit.point.x, hit.point.z))
          at(hit.point.x, hit.point.z);
        else if (d.lift) {
          const destination = actions.lift(d.lift);
          at(destination.x, destination.z);
        } else if (d.tour) actions.tour(d.tour);
        else if (d.replay) actions.replay(d.replay);
        else if (d.room) actions.art(d.room, d.index);
      });
    }
    renderer.xr.addEventListener('sessionend', () => {
      const h = head();
      const x = h.x,
        z = h.z;
      camera.getWorldDirection(dir);
      const yaw = Math.atan2(-dir.x, -dir.z);
      renderer.setAnimationLoop(null);
      session = null;
      rig.visible = false;
      sticks.clear();
      actions.exit(x, z, yaw);
    });
  }
  async function enter(pose) {
    const current = await navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
    });
    try {
      if (!controllers.length) setup();
      session = current;
      rig.visible = true;
      rig.position.set(pose.x, 0, pose.z);
      rig.rotation.y = pose.yaw;
      camera.position.set(0, 0, 0);
      camera.quaternion.identity();
      lastX = lastZ = Infinity;
      await renderer.xr.setSession(session);
      renderer.setAnimationLoop((time) => {
        if (!session) return;
        for (const input of session.inputSources) {
          const axes = input.gamepad?.axes;
          if (!axes || axes.length < 2) continue;
          const axis = axes[axes.length - 2];
          if (Math.abs(axis) < 0.35) sticks.delete(input);
          if (Math.abs(axis) > 0.72 && !sticks.has(input)) {
            sticks.add(input);
            const h = head(),
              x = h.x,
              z = h.z;
            rig.rotation.y -= (Math.sign(axis) * Math.PI) / 6;
            rig.updateMatrixWorld(true);
            at(x, z);
          }
        }
        for (const { c, line } of controllers)
          if (c.visible) line.scale.z = intersect(c)?.distance ?? 3;
        actions.tick(time);
        renderer.render(scene, camera);
        const h = head();
        if (Math.hypot(h.x - lastX, h.z - lastZ) > 0.12) {
          actions.moved(h.x, h.z);
          lastX = h.x;
          lastZ = h.z;
        }
      });
    } catch (error) {
      await current.end();
      throw error;
    }
  }
  rig.visible = false;
  return {
    enter,
    get active() {
      return Boolean(session);
    },
  };
}
