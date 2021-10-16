'use strict';

class Util {
    static worlds() {
        return [
            'salut', 'bonjour', 'wesh', 'hello', 'salem',
            'bonsoir', 'salam', 'holla', 'hallo', 'Ohayo',
            'konnichiwa', 'konbanwa', 'ossu', 'hey', 'yo',
            'yosh', 'vohiyo', 'hi', 'yeyguys', 'koncha',
            'coucou', 'cc', 'slt', 'bjr', 'wsh', 'bjs'
        ];
    };

    static hashello(str, worlds = Util.worlds()) {
        let found = false;

        str = str.toLowerCase();
        str = Util.profanity(str);

        for (const world of worlds) {
            const result = str.includes(world);
            if (result) {
                found = true;
                break;
            };
        };

        return found;
    };

    static profanity(str) {
        const rules = {
            'o': ['ô', 'ö', 'ò', 'ō'],
            'e': ['é', 'è', 'ê', 'ë'],
            'a': ['à', 'â', 'ä'],
            'i': ['ï', 'î', 'ì'],
            'c': ['ç'],
            'u': ['ù', 'û', 'ü', 'ù']
        };

        for (const [base, variants] of Object.entries(rules)) {
            for (const variant of variants) {
                str = str.replace(new RegExp(variant, 'gi'), base);
            };
        };

        return str;
    };
};

module.exports = Util;