export const HATS = {
  black: {
    id: 'black',
    emoji: '⚫',
    name: '毒舌評委',
    tagline: '找出所有問題與致命弱點！',
    prompt: '你的任務：用毒舌但理性的方式，指出這個方案最大的缺陷、風險和盲點。說真話，不留情面！',
    danmakuStyle: 'smoke',
    bg: '#111111', border: '#555555', text: '#ffffff', glow: 'rgba(255,255,255,0.15)',
  },
  red: {
    id: 'red',
    emoji: '🟥',
    name: '走心酸民',
    tagline: '用情緒和直覺開轟！',
    prompt: '你的任務：說出你的第一直覺和情緒反應。不需要邏輯，不需要理由，就是說出你的感受！',
    danmakuStyle: 'normal',
    bg: '#5c0000', border: '#ff4422', text: '#ffaaaa', glow: 'rgba(255,68,34,0.3)',
  },
  yellow: {
    id: 'yellow',
    emoji: '🟨',
    name: '盲目鐵粉',
    tagline: '無腦誇讚，找出所有優點！',
    prompt: '你的任務：找出這個方案最棒、最有潛力的地方！說出你最真誠的讚美，越誇張越好！',
    danmakuStyle: 'normal',
    bg: '#5a4a00', border: '#ffdd00', text: '#ffee99', glow: 'rgba(255,221,0,0.25)',
  },
  green: {
    id: 'green',
    emoji: '🟩',
    name: '腦洞大師',
    tagline: '提出最瘋狂的改善點子！',
    prompt: '你的任務：提出最天馬行空的改善建議！越腦洞越好，越異想天開越棒。打破常規！',
    danmakuStyle: 'electric',
    bg: '#004400', border: '#00cc44', text: '#aaffcc', glow: 'rgba(0,204,68,0.3)',
  },
  white: {
    id: 'white',
    emoji: '⬜',
    name: '數據魔人',
    tagline: '只說事實，拒絕一切主觀！',
    prompt: '你的任務：只列出客觀事實、數據和可測量的指標。不帶情緒，不帶判斷，只說「可以量化的事」。',
    danmakuStyle: 'normal',
    bg: '#252535', border: '#8888aa', text: '#ccccee', glow: 'rgba(136,136,170,0.2)',
  },
  blue: {
    id: 'blue',
    emoji: '🔵',
    name: '冷靜主席',
    tagline: '統整討論，掌控節奏！',
    prompt: '你的任務：觀察大家的發言，統整各方觀點，提出最客觀的總結，並帶出下一步的行動方向！',
    danmakuStyle: 'normal',
    bg: '#001a40', border: '#0088ff', text: '#aaddff', glow: 'rgba(0,136,255,0.25)',
  },
}

// 6 hats — 8 non-target groups assigned round-robin → 2 hats repeat
export const HAT_ORDER = ['black', 'red', 'yellow', 'green', 'white', 'blue']
