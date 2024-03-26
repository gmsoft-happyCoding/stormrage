class Base64VLQUtils {
  static base64Digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  static decodeBase64VLQ(base64String) {
    const base64Values = {};
    for (let i = 0; i < this.base64Digits.length; i++) {
      base64Values[this.base64Digits.charAt(i)] = i;
    }

    const base64Array = base64String.split('');
    let result = 0;
    let shift = 0;
    let i;

    for (i = 0; i < base64Array.length; i++) {
      const digit = base64Values[base64Array[i]];
      result += (digit & 0x1f) << shift;
      if ((digit & 0x20) === 0) {
        break;
      }
      shift += 5;
    }
    const isNegative = result & 1;
    const value = (result >> 1) * (isNegative ? -1 : 1);
    return { value: value, length: i + 1 };
  }

  static decodeMappings(mappings) {
    const decodedValues = [];
    let currentIndex = 0;
    while (currentIndex < mappings.length) {
      const { value, length } = this.decodeBase64VLQ(mappings.substr(currentIndex));
      decodedValues.push(value);
      currentIndex += length;
    }
    return decodedValues;
  }

  static encodeBase64VLQ(value) {
    value = value < 0 ? (-value << 1) | 1 : value << 1;

    let encoded = '';
    do {
      let digit = value & 0x1f;
      value >>= 5;
      if (value > 0) {
        digit |= 0x20;
      }
      encoded += this.base64Digits.charAt(digit);
    } while (value > 0);

    return encoded;
  }

  static encodeMappings(values) {
    let encodedString = '';
    for (let i = 0; i < values.length; i++) {
      encodedString += this.encodeBase64VLQ(values[i]);
    }
    return encodedString;
  }
}

module.exports = { Base64VLQUtils };
