// TODO: AI is overcomplicating the profanity filter. I just need to create a large JSON file provided by AI that contains maybe the biggest 50 swear words and use that to filter the events creations and questions.
// TODO: I need to make sure to create a response tailored to the profanity and to the appropiate context depending on where the profanity is found.
// TODO: The code below its a bit of an overkill for what I need.

let filter;

// Initialize the filter
const initialize = async () => {
    const { default: Filter } = await import('bad-words');
    filter = new Filter();
    // filter.addWords('someword', 'anotherword');
};

const containsProfanity = async (text) => {
    if (!filter) await initialize();
    if (!text) return false;
    return filter.isProfane(text);
};

const cleanText = async (text) => {
    if (!filter) await initialize();
    if (!text) return text;
    return filter.clean(text);
};

module.exports = {
    containsProfanity,
    cleanText
};