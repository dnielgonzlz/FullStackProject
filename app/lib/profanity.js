// TODO: AI is overcomplicating the profanity filter. I just need to create a large JSON file provided by AI that contains maybe the biggest 50 swear words and use that to filter the events creations and questions.
// TODO: I need to make sure to create a response tailored to the profanity and to the appropiate context depending on where the profanity is found.
// TODO: The code below its a bit of an overkill for what I need.

const Filter = require('bad-words');

// British swear words list
const britishSwearWords = [
    "bloody",
    "bugger",
    "git",
    "pillock",
    "wanker",
    "tosser",
    "bastard",
    "bollocks",
    "crap",
    "knob",
    "prat",
    "muppet",
    "sod",
    "shite",
    "arse",
    "twat",
    "plonker",
    "numpty",
    "berk",
    "div",
    "daft",
    "pill",
    "cow",
    "slapper",
    "sod off",
    "smeghead",
    "flippin",
    "fanny",
    "nob",
    "dickhead",
    "knobhead",
    "piss",
    "piss off",
    "arsehole",
    "buggery",
    "chuff",
    "minge",
    "prick",
    "shit",
    "shut up",
    "spanner",
    "tart",
    "whinger",
    "nonce",
    "gormless",
    "skank",
    "spaz",
    "bloomin",
    "frigging",
    "motherfucker",
    "bint"
];

// Initialize the filter
const filter = new Filter();

// Add the British swear words to the filter
filter.addWords(...britishSwearWords);



module.exports = {
    containsProfanity: (text) => {
        if (!text) return false;
        return filter.isProfane(text);
    },
    
    cleanText: (text) => {
        if (!text) return text;
        return filter.clean(text);
    }
};