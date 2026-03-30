import type { MutableRefObject } from "react";
import { Container, Graphics, Sprite, Text, TextStyle, type Application, type Texture } from "pixi.js";
import type { Agent, Hiring, Room, Task, SubAgent } from "../../types";
import { localeName } from "../../i18n";
import type { CallbackSnapshot, AnimItem, SubCloneAnimItem } from "./buildScene-types";
import {
  COLS_PER_ROW,
  ROOM_PAD,
  SLOT_H,
  SLOT_W,
  TARGET_CHAR_H,
  type RoomRect,
  type SubCloneBurstParticle,
  type WallClockVisual,
} from "./model";
import { DEPT_THEME, LOCALE_TEXT, type SupportedLocale, pickLocale } from "./themes-locale";
import {
  blendColor,
  contrastTextColor,
  drawAmbientGlow,
  drawCeilingLight,
  drawRoomAtmosphere,
  drawTiledFloor,
  drawWallClock,
  drawWindow,
  hashStr,
} from "./drawing-core";
import { drawPlant } from "./drawing-furniture-a";
import { renderDeskAgentAndSubClones } from "./buildScene-department-agent";

/** Theme used for project rooms — a distinct teal/cyan palette */
const PROJECT_ROOM_THEME = { floor1: 0xd2eae8, floor2: 0xc6e3e0, wall: 0x5a9e99, accent: 0x3da399 };
const PROJECT_ROOM_THEME_DARK = { floor1: 0x0c1a1a, floor2: 0x0a1616, wall: 0x1c4040, accent: 0x287070 };

interface BuildProjectRoomsParams {
  app: Application;
  textures: Record<string, Texture>;
  activeRooms: Room[];
  agents: Agent[];
  tasks: Task[];
  subAgents: SubAgent[];
  hirings: Hiring[];
  activeLocale: SupportedLocale;
  isDark: boolean;
  gridCols: number;
  roomStartX: number;
  roomW: number;
  roomH: number;
  roomGap: number;
  projectStartY: number;
  spriteMap: Map<string, number>;
  cbRef: MutableRefObject<CallbackSnapshot>;
  roomRectsRef: MutableRefObject<RoomRect[]>;
  agentPosRef: MutableRefObject<Map<string, { x: number; y: number }>>;
  animItemsRef: MutableRefObject<AnimItem[]>;
  subCloneAnimItemsRef: MutableRefObject<SubCloneAnimItem[]>;
  subCloneBurstParticlesRef: MutableRefObject<SubCloneBurstParticle[]>;
  wallClocksRef: MutableRefObject<WallClockVisual[]>;
  removedSubBurstsByParent: Map<string, Array<{ x: number; y: number }>>;
  addedWorkingSubIds: Set<string>;
  nextSubSnapshot: Map<string, { parentAgentId: string; x: number; y: number }>;
}

export function buildProjectRooms({
  app,
  textures,
  activeRooms,
  agents,
  tasks,
  subAgents,
  hirings,
  activeLocale,
  isDark,
  gridCols,
  roomStartX,
  roomW,
  roomH,
  roomGap,
  projectStartY,
  spriteMap,
  cbRef,
  roomRectsRef,
  agentPosRef,
  animItemsRef,
  subCloneAnimItemsRef,
  subCloneBurstParticlesRef,
  wallClocksRef,
  removedSubBurstsByParent,
  addedWorkingSubIds,
  nextSubSnapshot,
}: BuildProjectRoomsParams): void {
  const projectRooms = activeRooms.filter((r) => r.room_type === "project" && r.status === "active");
  if (projectRooms.length === 0) return;

  const theme = isDark ? PROJECT_ROOM_THEME_DARK : PROJECT_ROOM_THEME;

  // Build a set of hired agent ids for badge rendering
  const hiredAgentIds = new Set(hirings.filter((h) => h.status === "active").map((h) => h.hired_agent_id));

  projectRooms.forEach((projRoom, roomIdx) => {
    const col = roomIdx % gridCols;
    const row = Math.floor(roomIdx / gridCols);
    const rx = roomStartX + col * (roomW + roomGap);
    const ry = projectStartY + row * (roomH + roomGap);

    // Agents assigned to this room
    const roomAgents = agents.filter((agent) => agent.current_room_id === projRoom.id);

    const room = new Container();

    // Floor
    const floorG = new Graphics();
    drawTiledFloor(floorG, rx, ry, roomW, roomH, theme.floor1, theme.floor2);
    room.addChild(floorG);
    drawRoomAtmosphere(room, rx, ry, roomW, roomH, theme.wall, theme.accent);

    // Wall border
    const wallG = new Graphics();
    wallG.roundRect(rx, ry, roomW, roomH, 3).stroke({ width: 2.5, color: theme.wall });
    room.addChild(wallG);

    // Door
    const doorG = new Graphics();
    doorG.rect(rx + roomW / 2 - 16, ry - 2, 32, 5).fill(0xf5f0e8);
    room.addChild(doorG);

    // Sign
    const signLabel = `${pickLocale(activeLocale, LOCALE_TEXT.projectRoom)} ${projRoom.name.length > 12 ? projRoom.name.slice(0, 12) + "..." : projRoom.name}`;
    const signW = Math.max(84, signLabel.length * 5.5 + 16);
    const signBg = new Graphics();
    signBg.roundRect(rx + roomW / 2 - signW / 2 + 1, ry - 3, signW, 18, 4).fill({ color: 0x000000, alpha: 0.12 });
    signBg.roundRect(rx + roomW / 2 - signW / 2, ry - 4, signW, 18, 4).fill(theme.accent);
    room.addChild(signBg);
    const signTextColor = isDark ? 0xffffff : contrastTextColor(theme.accent);
    const signTxt = new Text({
      text: signLabel,
      style: new TextStyle({
        fontSize: 9,
        fill: signTextColor,
        fontWeight: "bold",
        fontFamily: "system-ui, sans-serif",
        dropShadow: isDark ? { alpha: 0.6, blur: 2, distance: 1, color: 0x000000 } : { alpha: 0.2, distance: 1, color: 0x000000 },
      }),
    });
    signTxt.anchor.set(0.5, 0.5);
    signTxt.position.set(rx + roomW / 2, ry + 5);
    room.addChild(signTxt);

    // Ceiling decor
    drawCeilingLight(room, rx + roomW / 2, ry + 14, theme.accent);
    drawAmbientGlow(room, rx + roomW / 2, ry + roomH / 2, roomW * 0.4, theme.accent, 0.04);
    drawWindow(room, rx + roomW / 2 - 12, ry + 16);
    wallClocksRef.current.push(drawWallClock(room, rx + roomW - 16, ry + 12));
    drawPlant(room, rx + 8, ry + roomH - 14, roomIdx + 10);
    drawPlant(room, rx + roomW - 12, ry + roomH - 14, roomIdx + 11);

    if (roomAgents.length === 0) {
      const emptyText = new Text({
        text: pickLocale(activeLocale, LOCALE_TEXT.noAssignedAgent),
        style: new TextStyle({ fontSize: 10, fill: 0x9a8a7a, fontFamily: "system-ui, sans-serif" }),
      });
      emptyText.anchor.set(0.5, 0.5);
      emptyText.position.set(rx + roomW / 2, ry + roomH / 2);
      room.addChild(emptyText);
    }

    roomAgents.forEach((agent, agentIdx) => {
      const acol = agentIdx % COLS_PER_ROW;
      const arow = Math.floor(agentIdx / COLS_PER_ROW);
      const ax = rx + ROOM_PAD + acol * SLOT_W + SLOT_W / 2;
      const ay = ry + 38 + arow * SLOT_H;
      const isWorking = agent.status === "working";
      const isOffline = agent.status === "offline";

      const nameY = ay;
      const charFeetY = nameY + 24 + TARGET_CHAR_H;
      const deskY = charFeetY - 8;

      agentPosRef.current.set(agent.id, { x: ax, y: deskY });

      // Agent name tag
      const nameText = new Text({
        text: localeName(activeLocale, agent),
        style: new TextStyle({
          fontSize: 7,
          fill: 0x3a3a4a,
          fontWeight: "bold",
          fontFamily: "system-ui, sans-serif",
        }),
      });
      nameText.anchor.set(0.5, 0);
      const nameTagW = nameText.width + 6;
      const nameTagBg = new Graphics();
      nameTagBg.roundRect(ax - nameTagW / 2, nameY, nameTagW, 12, 3).fill({ color: 0xffffff, alpha: 0.85 });
      room.addChild(nameTagBg);
      nameText.position.set(ax, nameY + 2);
      room.addChild(nameText);

      // Role tag
      const roleLabel = pickLocale(
        activeLocale,
        LOCALE_TEXT.role[agent.role as keyof typeof LOCALE_TEXT.role] || {
          ko: agent.role,
          en: agent.role,
          ja: agent.role,
          zh: agent.role,
        },
      );
      const roleText = new Text({
        text: roleLabel,
        style: new TextStyle({
          fontSize: 6,
          fill: contrastTextColor(theme.accent),
          fontFamily: "system-ui, sans-serif",
        }),
      });
      roleText.anchor.set(0.5, 0.5);
      const roleTagW = roleText.width + 5;
      const roleTagBg = new Graphics();
      roleTagBg.roundRect(ax - roleTagW / 2, nameY + 13, roleTagW, 9, 2).fill({ color: theme.accent, alpha: 0.82 });
      room.addChild(roleTagBg);
      roleText.position.set(ax, nameY + 17.5);
      room.addChild(roleText);

      // Hired senior badge
      if (hiredAgentIds.has(agent.id)) {
        const badgeText = new Text({
          text: pickLocale(activeLocale, LOCALE_TEXT.hiredBadge),
          style: new TextStyle({
            fontSize: 6,
            fill: 0xffffff,
            fontWeight: "bold",
            fontFamily: "system-ui, sans-serif",
          }),
        });
        badgeText.anchor.set(0.5, 0.5);
        const badgeW = badgeText.width + 6;
        const badgeBg = new Graphics();
        badgeBg.roundRect(ax - badgeW / 2, nameY + 23, badgeW, 9, 2).fill({ color: 0xd97706, alpha: 0.9 });
        badgeBg.roundRect(ax - badgeW / 2, nameY + 23, badgeW, 9, 2).stroke({ width: 0.6, color: 0xfbbf24, alpha: 0.5 });
        room.addChild(badgeBg);
        badgeText.position.set(ax, nameY + 27.5);
        room.addChild(badgeText);
      }

      // Desk, character, sub-clones
      renderDeskAgentAndSubClones({
        room,
        textures,
        spriteMap,
        agent,
        tasks,
        subAgents,
        ax,
        deskY,
        charFeetY,
        isWorking,
        isOffline,
        cbRef,
        animItemsRef,
        subCloneAnimItemsRef,
        subCloneBurstParticlesRef,
        addedWorkingSubIds,
        nextSubSnapshot,
        themeAccent: theme.accent,
      });
    });

    app.stage.addChild(room);
  });
}

export function getProjectRoomGridRows(activeRooms: Room[], gridCols: number): number {
  const projectRooms = activeRooms.filter((r) => r.room_type === "project" && r.status === "active");
  if (projectRooms.length === 0) return 0;
  return Math.ceil(projectRooms.length / gridCols);
}
