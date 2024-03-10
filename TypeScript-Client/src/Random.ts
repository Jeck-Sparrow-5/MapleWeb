/**
 * Gets random integer n such that min <= n <= max, i.e. inclusive.
 *
 * @param {int} min - Minimum.
 * @param {int} max - Maximum.
 * @return {int} Random integer.
 */
const randInt = function (min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
};

/**
 * Chances a given probability.
 *
 * The given probability p should be such that 0 <= p <= 1. For example,
 * p=0 => 0% success, p=0.5 => 50% success, p=1 => 100% success.
 *
 * @param {float} probability - Probability of success.
 * @return {Boolean} True if success, false otherwise.
 */
const chance = function (probability: number) {
  return probability > Math.random();
};

/**
 * Generates random stats for dice roll during character creation.
 *
 * Each stat s is such that 4 <= s <= 13 and the sum of all stats is 25.
 * Stats are returned in an array.
 *
 * @return {Array} Random stats.
 */
const generateDiceRollStats = function () {
  const randInt = Random.randInt;
  const diffArr = [0, randInt(0, 9), randInt(0, 9), randInt(0, 9), 9];
  diffArr.sort((a, b) => a - b);
  return [
    4 + diffArr[1] - diffArr[0],
    4 + diffArr[2] - diffArr[1],
    4 + diffArr[3] - diffArr[2],
    4 + diffArr[4] - diffArr[3],
  ];
};

const Random = {
  randInt,
  chance,
  generateDiceRollStats,
};

export default Random;
