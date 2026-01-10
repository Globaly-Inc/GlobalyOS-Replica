/**
 * Centralized Emoji Library
 * Single source of truth for all emoji data across GlobalyOS
 */

export interface EmojiCategory {
  label: string;
  icon: string;
  emojis: string[];
}

/**
 * Categorized emoji library for reactions and messaging
 */
export const EMOJI_CATEGORIES: Record<string, EmojiCategory> = {
  smileys: {
    label: 'Smileys & Emotion',
    icon: 'Smile',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
      '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
      '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌',
      '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
      '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓',
      '🧐', '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳',
      '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
      '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠',
    ],
  },
  gestures: {
    label: 'Gestures & People',
    icon: 'Hand',
    emojis: [
      '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲',
      '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
      '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
      '✍️', '💪', '🦵', '🦶', '👂', '👃', '🧠', '👀', '👁️', '👅',
      '👄', '💋', '🫦', '🫵', '🫱', '🫲', '🫳', '🫴', '🫰', '🤙',
    ],
  },
  hearts: {
    label: 'Hearts & Love',
    icon: 'Heart',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💝', '💘', '💟',
      '♥️', '💌', '😻', '🥰', '😍', '🤩', '😘', '💏', '💑', '👩‍❤️‍👨',
    ],
  },
  celebrations: {
    label: 'Celebrations',
    icon: 'PartyPopper',
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🎀', '🏆', '🥇', '🥈', '🥉', '🏅',
      '🎖️', '🎗️', '✨', '🌟', '💫', '⭐', '🔥', '💥', '💯', '🎯',
      '🎂', '🍾', '🥂', '🍻', '🪅', '🎆', '🎇', '🧨', '🪩', '🎤',
      '🎪', '🎭', '🎨', '🎬', '🎵', '🎶', '🎹', '🎸', '🎺', '🪘',
    ],
  },
  objects: {
    label: 'Objects & Symbols',
    icon: 'Lightbulb',
    emojis: [
      '💡', '📌', '📍', '🔔', '🔕', '📢', '📣', '💬', '💭', '🗯️',
      '👁️‍🗨️', '🔍', '🔎', '📝', '✅', '❌', '⭕', '❓', '❗', '⚠️',
      '🚀', '⚡', '🎵', '🎶', '💰', '💵', '💸', '🔑', '🗝️', '⚙️',
      '🔧', '🔨', '⛏️', '🛠️', '📱', '💻', '🖥️', '🖨️', '⌨️', '📷',
      '📸', '📹', '🎥', '📺', '📻', '⏰', '⌚', '🕐', '📅', '📆',
      '✏️', '📎', '📐', '✂️', '📏', '🔗', '📋', '📁', '📂', '🗂️',
    ],
  },
  animals: {
    label: 'Animals & Nature',
    icon: 'Cat',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🦄',
      '🐝', '🦋', '🐢', '🐍', '🦖', '🐙', '🦀', '🐠', '🐟', '🐬',
      '🐳', '🦈', '🐊', '🦎', '🦒', '🦓', '🐘', '🦣', '🦏', '🐪',
      '🌸', '🌺', '🌻', '🌹', '🌷', '🌱', '🌲', '🌴', '🍀', '🍁',
      '🍂', '🍃', '🌿', '☘️', '🌾', '🌵', '🪴', '🎋', '🎍', '🪨',
    ],
  },
  food: {
    label: 'Food & Drink',
    icon: 'Coffee',
    emojis: [
      '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑',
      '🥭', '🍍', '🥥', '🥝', '🍕', '🍔', '🍟', '🌮', '🍣', '🍩',
      '🍪', '🎂', '🍰', '☕', '🍺', '🍷', '🍸', '🥤', '🧃', '🧋',
      '🥐', '🥖', '🥨', '🧀', '🥚', '🍳', '🥓', '🥩', '🍗', '🍖',
      '🌭', '🥪', '🥙', '🧆', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱',
      '🥟', '🍤', '🍙', '🍚', '🍘', '🥮', '🍡', '🥧', '🍦', '🍨',
    ],
  },
};

/**
 * Flattened list of all emojis for search functionality
 */
export const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flatMap(c => c.emojis);

/**
 * Quick reaction emojis (shown first row / as defaults)
 */
export const QUICK_REACTION_EMOJIS = [
  '👍', '❤️', '🎉', '👏', '🔥', '💯', '😂', '🤔', '😊', '✨', '🙌', '👀'
];

/**
 * Emoji to searchable keywords mapping for search functionality
 */
export const EMOJI_KEYWORDS: Record<string, string[]> = {
  // Smileys & Gestures
  '👍': ['thumbs up', 'yes', 'ok', 'agree', 'like', 'good', 'approve', 'nice', 'great'],
  '👎': ['thumbs down', 'no', 'disagree', 'dislike', 'bad', 'reject'],
  '❤️': ['heart', 'love', 'like', 'red heart', 'affection', 'romance'],
  '🧡': ['orange heart', 'heart', 'love', 'orange'],
  '💛': ['yellow heart', 'heart', 'love', 'yellow', 'friendship'],
  '💚': ['green heart', 'heart', 'love', 'green', 'jealous'],
  '💙': ['blue heart', 'heart', 'love', 'blue', 'trust'],
  '💜': ['purple heart', 'heart', 'love', 'purple'],
  '🖤': ['black heart', 'heart', 'love', 'black', 'dark'],
  '🤍': ['white heart', 'heart', 'love', 'white', 'pure'],
  '🤎': ['brown heart', 'heart', 'love', 'brown'],
  '💔': ['broken heart', 'heart', 'sad', 'breakup', 'hurt'],
  '🎉': ['party', 'celebrate', 'celebration', 'congrats', 'tada', 'hooray', 'confetti'],
  '🎊': ['confetti', 'party', 'celebrate', 'ball'],
  '🔥': ['fire', 'hot', 'lit', 'awesome', 'amazing', 'flame', 'trending'],
  '💯': ['hundred', '100', 'perfect', 'score', 'complete', 'full'],
  '😂': ['laugh', 'lol', 'haha', 'funny', 'joy', 'tears', 'crying laughing'],
  '🤣': ['rofl', 'rolling', 'laugh', 'lmao', 'floor'],
  '😊': ['smile', 'happy', 'blush', 'pleased', 'content'],
  '😀': ['grin', 'smile', 'happy', 'grinning'],
  '😃': ['smile', 'happy', 'grin', 'excited'],
  '😄': ['laugh', 'smile', 'happy', 'grin', 'joy'],
  '😁': ['grin', 'smile', 'beam', 'happy'],
  '😆': ['laugh', 'xd', 'squint', 'happy'],
  '😅': ['sweat', 'nervous', 'phew', 'relief', 'awkward'],
  '🙂': ['slight smile', 'smile', 'okay'],
  '😇': ['angel', 'innocent', 'halo', 'blessed'],
  '🥰': ['love', 'hearts', 'adore', 'affection', 'smiling'],
  '😍': ['love', 'heart eyes', 'crush', 'adore', 'beautiful'],
  '🤩': ['star', 'excited', 'amazing', 'star struck', 'wow'],
  '😘': ['kiss', 'love', 'blow kiss', 'flirt'],
  '😗': ['kiss', 'whistle', 'pout'],
  '😚': ['kiss', 'blush', 'closed eyes'],
  '😙': ['kiss', 'smirk', 'whistling'],
  '🥲': ['happy tears', 'grateful', 'touched', 'bittersweet'],
  '😋': ['yum', 'delicious', 'tasty', 'tongue', 'food'],
  '😛': ['tongue', 'silly', 'playful', 'bleh'],
  '😜': ['wink', 'tongue', 'silly', 'crazy', 'playful'],
  '🤪': ['crazy', 'zany', 'wild', 'goofy', 'silly'],
  '😝': ['tongue', 'squint', 'silly', 'bleh'],
  '🤑': ['money', 'rich', 'dollar', 'greedy', 'wealth'],
  '🤗': ['hug', 'hugging', 'embrace', 'warm'],
  '🤭': ['oops', 'giggle', 'shy', 'cover mouth'],
  '🤫': ['shh', 'quiet', 'secret', 'shush', 'silent'],
  '🤔': ['think', 'thinking', 'hmm', 'consider', 'ponder', 'curious'],
  '🤐': ['zip', 'quiet', 'shut up', 'zipper', 'silent'],
  '🤨': ['skeptical', 'raised eyebrow', 'doubt', 'suspicious'],
  '😐': ['neutral', 'meh', 'straight face', 'indifferent'],
  '😑': ['expressionless', 'blank', 'unamused', 'annoyed'],
  '😶': ['silent', 'no words', 'speechless', 'mute'],
  '😏': ['smirk', 'sly', 'flirt', 'suggestive'],
  '😒': ['unamused', 'meh', 'side eye', 'annoyed'],
  '🙄': ['eye roll', 'whatever', 'annoyed', 'bored'],
  '😬': ['grimace', 'awkward', 'cringe', 'yikes'],
  '😌': ['relieved', 'calm', 'peaceful', 'content'],
  '😔': ['sad', 'pensive', 'disappointed', 'down'],
  '😪': ['sleepy', 'tired', 'drowsy', 'snot'],
  '🤤': ['drool', 'yummy', 'want', 'hungry'],
  '😴': ['sleep', 'zzz', 'tired', 'snoring'],
  '😷': ['mask', 'sick', 'medical', 'ill', 'covid'],
  '🤒': ['sick', 'fever', 'ill', 'thermometer'],
  '🤕': ['hurt', 'injured', 'bandage', 'head'],
  '🤢': ['sick', 'nauseated', 'gross', 'ill'],
  '🤮': ['vomit', 'puke', 'sick', 'disgusted'],
  '🤧': ['sneeze', 'sick', 'allergy', 'cold'],
  '🥵': ['hot', 'sweating', 'heat', 'fever'],
  '🥶': ['cold', 'freezing', 'frozen', 'ice'],
  '🥴': ['drunk', 'woozy', 'dizzy', 'tipsy'],
  '😵': ['dizzy', 'knocked out', 'dead', 'spiral'],
  '🤯': ['mind blown', 'exploding head', 'shocked', 'amazed'],
  '🤠': ['cowboy', 'yeehaw', 'country', 'western'],
  '🥳': ['party', 'birthday', 'celebrate', 'horn'],
  '🥸': ['disguise', 'incognito', 'spy', 'glasses'],
  '😎': ['cool', 'sunglasses', 'awesome', 'confident'],
  '🤓': ['nerd', 'geek', 'smart', 'glasses', 'study'],
  '🧐': ['monocle', 'fancy', 'investigate', 'curious'],
  '😕': ['confused', 'puzzled', 'unsure'],
  '😟': ['worried', 'concerned', 'anxious'],
  '🙁': ['sad', 'frown', 'unhappy', 'down'],
  '😮': ['surprised', 'wow', 'omg', 'open mouth'],
  '😯': ['hushed', 'surprised', 'stunned'],
  '😲': ['astonished', 'shocked', 'amazed'],
  '😳': ['flushed', 'embarrassed', 'shy', 'blushing'],
  '🥺': ['pleading', 'puppy eyes', 'please', 'cute', 'begging'],
  '🥹': ['holding tears', 'touched', 'grateful', 'emotional'],
  '😨': ['fearful', 'scared', 'afraid', 'frightened'],
  '😰': ['anxious', 'nervous', 'stressed', 'cold sweat'],
  '😥': ['disappointed', 'relieved', 'sad', 'phew'],
  '😢': ['cry', 'sad', 'tear', 'upset'],
  '😭': ['sobbing', 'crying', 'sad', 'wailing', 'tears'],
  '😱': ['scream', 'scared', 'terrified', 'horror', 'shocked'],
  '😖': ['confounded', 'frustrated', 'confused'],
  '😣': ['persevere', 'struggle', 'pain', 'effort'],
  '😞': ['disappointed', 'sad', 'dejected', 'down'],
  '😓': ['downcast', 'sweat', 'hard work', 'stressed'],
  '😩': ['weary', 'tired', 'exhausted', 'frustrated'],
  '😫': ['tired', 'exhausted', 'done', 'frustrated'],
  '🥱': ['yawn', 'tired', 'sleepy', 'bored'],
  '😤': ['triumph', 'angry', 'huffing', 'frustrated', 'determined'],
  '😡': ['angry', 'mad', 'pouting', 'red face'],
  '😠': ['angry', 'mad', 'annoyed', 'grumpy'],
  // Gestures
  '👊': ['fist', 'punch', 'bump', 'power'],
  '✊': ['raised fist', 'power', 'solidarity', 'strong'],
  '🤛': ['left fist', 'fist bump', 'punch'],
  '🤜': ['right fist', 'fist bump', 'punch'],
  '👏': ['clap', 'applause', 'bravo', 'congrats', 'well done'],
  '🙌': ['hands up', 'praise', 'celebrate', 'hallelujah', 'yay'],
  '👐': ['open hands', 'jazz hands', 'hug'],
  '🤲': ['palms up', 'prayer', 'asking', 'please'],
  '🤝': ['handshake', 'deal', 'agreement', 'partner', 'welcome'],
  '🙏': ['pray', 'please', 'thanks', 'hope', 'namaste', 'grateful'],
  '✌️': ['peace', 'victory', 'v sign', 'two'],
  '🤞': ['crossed fingers', 'luck', 'hope', 'wish'],
  '🤟': ['love you', 'rock', 'sign language'],
  '🤘': ['rock on', 'metal', 'horns'],
  '🤙': ['call me', 'shaka', 'hang loose', 'phone'],
  '👈': ['point left', 'left', 'direction', 'back'],
  '👉': ['point right', 'right', 'direction', 'this'],
  '👆': ['point up', 'up', 'above'],
  '👇': ['point down', 'down', 'below'],
  '☝️': ['index up', 'one', 'wait', 'idea'],
  '👋': ['wave', 'hello', 'hi', 'bye', 'goodbye'],
  '🤚': ['raised hand', 'stop', 'high five'],
  '🖐️': ['hand', 'five', 'high five', 'stop'],
  '✋': ['raised hand', 'stop', 'high five', 'halt'],
  '🖖': ['vulcan', 'spock', 'live long', 'star trek'],
  '👌': ['ok', 'perfect', 'fine', 'good', 'nice'],
  '🤌': ['pinched fingers', 'italian', 'chef kiss', 'perfect'],
  '🤏': ['pinching', 'small', 'tiny', 'little bit'],
  '✍️': ['writing', 'write', 'sign', 'signature'],
  '💪': ['strong', 'muscle', 'flex', 'power', 'workout', 'gym'],
  '👀': ['eyes', 'look', 'see', 'watching', 'stare'],
  '👁️': ['eye', 'look', 'see', 'watch'],
  '👅': ['tongue', 'taste', 'lick'],
  '👄': ['lips', 'mouth', 'kiss'],
  '💋': ['kiss', 'lips', 'love', 'lipstick'],
  // Celebrations
  '🎈': ['balloon', 'party', 'birthday', 'celebration'],
  '🎁': ['gift', 'present', 'wrapped', 'birthday', 'christmas'],
  '🎀': ['ribbon', 'bow', 'gift', 'present'],
  '🏆': ['trophy', 'win', 'champion', 'first place', 'winner', 'award'],
  '🥇': ['gold medal', 'first', 'winner', 'champion', 'best'],
  '🥈': ['silver medal', 'second', 'runner up'],
  '🥉': ['bronze medal', 'third', 'place'],
  '🏅': ['medal', 'sports', 'award', 'achievement'],
  '🎖️': ['military medal', 'honor', 'award'],
  '✨': ['sparkles', 'shine', 'magic', 'clean', 'new', 'special'],
  '🌟': ['star', 'shine', 'glow', 'glowing'],
  '💫': ['dizzy', 'star', 'magic', 'sparkle'],
  '⭐': ['star', 'favorite', 'rating', 'gold star'],
  '💥': ['boom', 'explosion', 'collision', 'bang', 'impact'],
  '🎯': ['target', 'bullseye', 'goal', 'aim', 'direct hit'],
  '🎂': ['birthday cake', 'cake', 'birthday', 'party'],
  '🍾': ['champagne', 'celebrate', 'pop', 'bottle'],
  '🥂': ['cheers', 'toast', 'champagne', 'celebrate', 'glasses'],
  '🍻': ['beer', 'cheers', 'celebrate', 'drinks'],
  // Objects
  '💡': ['light bulb', 'idea', 'bright', 'tip', 'creative'],
  '📌': ['pin', 'pushpin', 'location', 'mark', 'important'],
  '📍': ['location', 'pin', 'place', 'map'],
  '🔔': ['bell', 'notification', 'alert', 'ring', 'reminder'],
  '🔕': ['muted', 'no bell', 'silent', 'quiet'],
  '📢': ['loudspeaker', 'announcement', 'broadcast', 'attention'],
  '📣': ['megaphone', 'cheer', 'announcement', 'loud'],
  '💬': ['speech bubble', 'comment', 'message', 'chat', 'talk'],
  '💭': ['thought bubble', 'think', 'idea', 'dream'],
  '🗯️': ['anger bubble', 'mad', 'rant'],
  '🔍': ['magnifying glass', 'search', 'zoom', 'find', 'look'],
  '🔎': ['magnifying glass right', 'search', 'zoom', 'find'],
  '📝': ['memo', 'note', 'write', 'document', 'list'],
  '✅': ['check', 'done', 'complete', 'correct', 'yes', 'green'],
  '❌': ['cross', 'wrong', 'no', 'delete', 'error', 'x'],
  '⭕': ['circle', 'correct', 'round'],
  '❓': ['question', 'what', 'confused', 'help'],
  '❗': ['exclamation', 'important', 'alert', 'warning', 'attention'],
  '⚠️': ['warning', 'caution', 'alert', 'danger'],
  '🚀': ['rocket', 'launch', 'fast', 'startup', 'ship', 'space', 'go'],
  '⚡': ['lightning', 'fast', 'power', 'electric', 'quick', 'zap'],
  '🎵': ['music', 'note', 'song', 'melody'],
  '🎶': ['music notes', 'song', 'melody', 'singing'],
  '💰': ['money bag', 'rich', 'dollar', 'cash'],
  '💵': ['dollar', 'money', 'cash', 'bill'],
  '💸': ['money wings', 'spending', 'flying money', 'expensive'],
  '🔑': ['key', 'lock', 'password', 'access', 'security'],
  '⚙️': ['gear', 'settings', 'cog', 'config', 'mechanical'],
  '🔧': ['wrench', 'tool', 'fix', 'repair'],
  '🔨': ['hammer', 'tool', 'build', 'construction'],
  '📱': ['phone', 'mobile', 'smartphone', 'cell'],
  '💻': ['laptop', 'computer', 'work', 'code'],
  '⏰': ['alarm clock', 'time', 'wake up', 'reminder'],
  '📅': ['calendar', 'date', 'schedule', 'event'],
  '📎': ['paperclip', 'attach', 'attachment', 'clip'],
  '🔗': ['link', 'chain', 'connect', 'url'],
  '📋': ['clipboard', 'list', 'paste', 'copy'],
  // Animals
  '🐶': ['dog', 'puppy', 'pet', 'cute', 'woof'],
  '🐱': ['cat', 'kitty', 'pet', 'cute', 'meow'],
  '🐭': ['mouse', 'rat', 'cute', 'small'],
  '🐹': ['hamster', 'pet', 'cute', 'rodent'],
  '🐰': ['rabbit', 'bunny', 'cute', 'easter'],
  '🦊': ['fox', 'clever', 'orange', 'cute'],
  '🐻': ['bear', 'teddy', 'cute', 'animal'],
  '🐼': ['panda', 'cute', 'bear', 'china'],
  '🐨': ['koala', 'cute', 'australia', 'bear'],
  '🐯': ['tiger', 'cat', 'wild', 'rawr'],
  '🦁': ['lion', 'king', 'cat', 'roar', 'brave'],
  '🐮': ['cow', 'moo', 'farm', 'animal'],
  '🐷': ['pig', 'oink', 'farm', 'cute'],
  '🐸': ['frog', 'ribbit', 'green', 'amphibian'],
  '🐵': ['monkey', 'ape', 'primate', 'cute'],
  '🙈': ['see no evil', 'monkey', 'hide', 'shy', 'embarrassed'],
  '🙉': ['hear no evil', 'monkey', 'ignore', 'not listening'],
  '🙊': ['speak no evil', 'monkey', 'secret', 'oops', 'quiet'],
  '🦄': ['unicorn', 'magic', 'fantasy', 'rainbow', 'special'],
  '🐝': ['bee', 'honey', 'buzz', 'insect'],
  '🦋': ['butterfly', 'beautiful', 'insect', 'nature'],
  '🐢': ['turtle', 'slow', 'shell', 'reptile'],
  '🐍': ['snake', 'reptile', 'slither', 'danger'],
  '🦖': ['dinosaur', 't-rex', 'extinct', 'rawr'],
  // Food
  '🍎': ['apple', 'red', 'fruit', 'healthy'],
  '🍊': ['orange', 'fruit', 'citrus', 'tangerine'],
  '🍋': ['lemon', 'sour', 'citrus', 'yellow'],
  '🍌': ['banana', 'fruit', 'yellow', 'potassium'],
  '🍉': ['watermelon', 'summer', 'fruit', 'refreshing'],
  '🍇': ['grapes', 'purple', 'wine', 'fruit'],
  '🍓': ['strawberry', 'red', 'fruit', 'berry'],
  '🍒': ['cherry', 'red', 'fruit', 'sweet'],
  '🍑': ['peach', 'fruit', 'sweet', 'butt'],
  '🍕': ['pizza', 'food', 'italian', 'slice'],
  '🍔': ['burger', 'hamburger', 'food', 'fast food'],
  '🍟': ['fries', 'french fries', 'food', 'potato'],
  '🌮': ['taco', 'mexican', 'food', 'tuesday'],
  '🍣': ['sushi', 'japanese', 'food', 'fish', 'rice'],
  '🍩': ['donut', 'doughnut', 'sweet', 'dessert'],
  '🍪': ['cookie', 'biscuit', 'sweet', 'chocolate chip'],
  // '🎂' already defined in celebrations section
  '🍰': ['cake', 'slice', 'dessert', 'sweet', 'shortcake'],
  '☕': ['coffee', 'hot', 'cafe', 'drink', 'morning', 'tea'],
  '🍺': ['beer', 'drink', 'alcohol', 'mug', 'bar'],
  '🍷': ['wine', 'red wine', 'drink', 'alcohol', 'glass'],
};

/**
 * Search emojis by keyword
 */
export const searchEmojis = (query: string): string[] => {
  if (!query.trim()) return [];
  
  const lowerQuery = query.toLowerCase().trim();
  const results = new Set<string>();
  
  // Search in keywords
  Object.entries(EMOJI_KEYWORDS).forEach(([emoji, keywords]) => {
    if (keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))) {
      results.add(emoji);
    }
  });
  
  // Also search in all emojis (in case emoji itself is typed)
  ALL_EMOJIS.forEach(emoji => {
    if (emoji.includes(query)) {
      results.add(emoji);
    }
  });
  
  return Array.from(results);
};

// Backward compatible exports for existing components
export const EMOJI_OPTIONS = QUICK_REACTION_EMOJIS.slice(0, 8);
export const EMOJI_LIST = QUICK_REACTION_EMOJIS.slice(0, 12);
