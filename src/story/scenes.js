// The story as one continuous drift. It is split into scenes and small "beats"
// only for writing; the player never sees a chapter break.
// All narration here is original text.
//
// env (blends in slowly; keys not given carry over):
//   stars   star brightness          rain   rain strength
//   wave    swell height             glint  sparkle on the water
//   below   brightness under water   above  brightness of the surface world
//   veil    darkening overlay        pose   traveler: 0 curled, 1 sitting up, 2 standing
//   starPath light road on the water toward the north star
//
// A beat: { say, env, events, targets, wait }
//   say      a line shown when the beat starts
//   events   things that happen when it starts (see Story.event)
//   targets  things to touch; each gives one light and shows its line
//     kind 'touch' (default) | 'water' (touch the sea `times` times)
//          'trace' (draw on the water `length` units) | 'hold' (keep a finger on it `hold` seconds)
//   wait     a beat with no targets moves on after `wait` seconds

export const START_ENV = {
  stars: 0.35, rain: 0, wave: 0.6, glint: 0.5, below: 0.35, above: 1, veil: 0, pose: 0, starPath: 0,
};

export const TITLE = {
  name: '北の星をさがして',
  sub: '行き先のない小舟と、夜の海の物語',
  hint: '触れる・なぞる・手をかざす',
};

export const SCENES = [
  // --- still water ---
  {
    env: { stars: 0.4, wave: 0.5, below: 0.4 },
    beats: [
      {
        say: '波の音だけが聞こえる。舟は、どこにも向かっていない。',
        targets: [{ key: 'water', kind: 'water', times: 2, lines: ['指先から、小さな波紋がひろがる。', '波紋は、すぐに静けさにのまれていった。'] }],
      },
      {
        say: '水面を、そっとなぞってみる。',
        targets: [{ key: 'water', kind: 'trace', length: 14, lines: ['なぞった跡が、しばらく青く光っていた。'] }],
      },
      {
        targets: [{ key: 'traveler', times: 2, lines: ['眠っているあいだだけ、何も考えずにいられる。', 'まぶたが、少しだけ動いた。'] }],
      },
      {
        say: '空の端を、何かが横切った。',
        env: { pose: 0.15 },
        events: ['shootingStar'],
        targets: [{ key: 'shootingStar', lines: ['願いごとは思いつかなかった。それでも、目で追っていた。'] }],
      },
    ],
  },

  // --- things drifting by ---
  {
    env: { stars: 0.5, wave: 0.7, below: 0.5 },
    beats: [
      {
        say: '何かが、こちらへ流れてくる。',
        events: ['flotsam:rope', 'flotsam:bottle'],
        targets: [
          { key: 'rope', lines: ['結び目は、気づかないうちにゆるんでいく。'] },
          { key: 'bottle', lines: ['宛先のない手紙。誰かに見つけてほしかったのかもしれない。'] },
        ],
      },
      {
        say: '舟の下で、何かが灯った。',
        events: ['appear:jelly1'],
        targets: [{ key: 'jelly1', lines: ['暗い水の底にも、灯りをともすものがいる。'] }],
      },
      {
        events: ['flotsam:paperBoat'],
        targets: [{ key: 'paperBoat', lines: ['誰かが折った小さな紙の舟。ここまで、ひとりで流れてきたのだろうか。'] }],
      },
      {
        say: '舳先の綱が、波にゆれている。',
        targets: [{ key: 'boatRope', lines: ['自分の舟の綱も、とっくにほどけていた。'] }],
      },
    ],
  },

  // --- rain ---
  {
    env: { stars: 0.12, rain: 1, wave: 1.3, glint: 0.2, below: 0.45 },
    beats: [
      {
        say: '雨が降りはじめた。',
        targets: [{ key: 'water', kind: 'water', times: 2, lines: ['雨粒が、水面にいくつも輪をつくる。', '冷たいのに、どこかやさしい。'] }],
      },
      {
        say: '舟べりの古い傷に、雨がしみていく。',
        targets: [
          { key: 'scar0', lines: ['ずっと前についた傷。もう、理由も思い出せない。'] },
          { key: 'scar1', lines: ['触れても、思ったほど痛くなかった。'] },
          { key: 'scar2', lines: ['流れていくものを、無理に止めなくてもいい。'] },
        ],
      },
      {
        say: '大きな影が近づいてくる。',
        events: ['appear:whale'],
        targets: [{ key: 'whale', lines: ['大きな影が、何も言わずに舟の下をくぐっていった。'] }],
      },
      {
        say: '雨の音を聞いていると、少しだけ眠れそうな気がした。',
        env: { rain: 0, stars: 0.25, wave: 0.8, glint: 0.4, pose: 0.45 },
        wait: 6,
      },
      {
        targets: [{ key: 'traveler', lines: ['雨上がりの空気を、ゆっくり吸いこんだ。'] }],
      },
    ],
  },

  // --- darkness ---
  {
    env: { stars: 0.02, wave: 0.9, glint: 0, below: 0.16, above: 0.55, veil: 0.45 },
    beats: [
      {
        say: '星が、ひとつずつ見えなくなっていく。',
        wait: 4,
      },
      {
        say: '灯りに手をかざして、しばらくそのままでいる。',
        targets: [{ key: 'lantern', kind: 'hold', hold: 1.8, lines: ['消えそうな灯りを、両手で囲った。'] }],
      },
      {
        events: ['appear:fish', 'appear:manta'],
        targets: [
          { key: 'fish', lines: ['小さな光が群れになって、闇をすり抜けていく。'] },
          { key: 'manta', lines: ['重たい翼で、それでも水をかいて進んでいく。'] },
        ],
      },
      {
        say: '遠くに、小さな灯りが見える。',
        events: ['farLight'],
        targets: [{ key: 'farLight', lines: ['近づくほど遠ざかる灯り。あれは、自分のためのものではなかった。'] }],
      },
      {
        events: ['flotsam:feather'],
        targets: [{ key: 'feather', lines: ['どこから来たのかわからない羽根。軽すぎて、沈むこともできない。'] }],
      },
      {
        say: '水の下から、ゆっくりと何かが浮かんでくる。',
        events: ['appear:turtle'],
        targets: [{ key: 'turtle', lines: ['急がなくていい、と言われた気がした。'] }],
      },
    ],
  },

  // --- someone beside you ---
  {
    env: { stars: 0.35, wave: 0.6, glint: 0.5, below: 0.5, above: 1, veil: 0, pose: 0.7 },
    beats: [
      {
        say: '遠くで、羽ばたく音がした。',
        events: ['bird'],
        targets: [{ key: 'bird', lines: ['ひとりで漂っていた舟に、もうひとつの灯りがともる。'] }],
      },
      {
        say: '海鳥が、夜の空へ舞い上がった。',
        events: ['birdLoop'],
        targets: [{ key: 'gift', lines: ['小さな光をくわえて、戻ってきた。'] }],
      },
      {
        events: ['appear:stingray', 'appear:jelly2', 'appear:jelly3'],
        targets: [{ key: 'jelly2', lines: ['気づけば、まわりにいくつも灯りが揺れていた。'] }],
      },
      {
        env: { pose: 1 },
        targets: [{ key: 'traveler', lines: ['となりに誰かがいると、夜は少しだけ短くなる。'] }],
      },
    ],
  },

  // --- the north star ---
  {
    env: { stars: 0.5, wave: 0.5, glint: 0.8, below: 0.75 },
    beats: [
      {
        say: '集めた光が、空へ昇っていく。',
        events: ['polaris'],
        targets: [{ key: 'polaris', lines: ['暗い夜でも、ひとつの光があれば進んでいける。'] }],
      },
    ],
  },
];

export const POLARIS_LINE = '北の空に、ひとつの星が灯った。';

export const ENDING = {
  line: '行き先は、まだ知らない。それでも舟は進んでいく。',
  again: 'タップでもう一度',
};

/** Lights the lantern can hold over the whole journey (everything before the north star). */
export const TOTAL_LIGHTS = SCENES.flatMap((s) => s.beats)
  .flatMap((b) => b.targets ?? [])
  .filter((t) => t.key !== 'polaris')
  .reduce((n, t) => n + (t.times ?? 1), 0);
