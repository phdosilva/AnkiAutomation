const urlStandard = 'https://www.wordreference.com';
const urlSource = 'https://www.wordreference.com/enpt/';
const urlContextReverso = 'https://context.reverso.net/traducao/ingles-portugues/';

let countSuccessfulWords = 0;

const getWordsInput = async() => {
    const text = await document.getElementById('words');
    return text.value.split('\n');
}

const getDom = async(url) => {
    const response = await fetch(url);
    const text = await response.text();
    const wordreferenceDocument = new DOMParser().parseFromString(text, "text/html");

    return wordreferenceDocument;
}

const getTitle = domDocument => {
    try {
        return domDocument.getElementsByClassName('headerWord')[0].innerText;
    } catch {
        return;
    }
}

const getFirstRowElement = async(firstRow) => {
    const tdsFirstEvenRow = firstRow.getElementsByTagName('td');
    const similarCamp = await tdsFirstEvenRow[0].firstChild.innerText;
    const similar = similarCamp.match(/[a-zA-Z]*/)[0];
    const synonym = await tdsFirstEvenRow[1].innerText;
    const childsThirdTd = tdsFirstEvenRow[2].childNodes;
    const translation = await childsThirdTd[0].nodeValue;

    return {
        similar,
        synonym,
        translation
    };
}

const getTableAnswer = wordreferenceDocument => {
    const tableResponseList = wordreferenceDocument.getElementsByClassName('WRD');
    return tableResponseList[0];
}

const getAnswer = async tableWRD => {
    const rows = await tableWRD.getElementsByTagName('tr');

    let i = 0;
    while (rows[i].className != 'even') i++;

    const {
        similar,
        synonym,
        translation
    } = await getFirstRowElement(rows[i]);

    let sentence;

    try {
        while (rows[i].getElementsByClassName('FrEx').length == 0) i++;
        sentence = rows[i].getElementsByClassName('FrEx')[0].innerText.replace(similar, `<b>${similar}</b>`);
    } catch {
        sentence = '';
    }

    return {
        similar,
        synonym,
        translation,
        sentence
    }
}

const getPronounce = async pronounceCamp => {
    const textPronounceCamp = await pronounceCamp.innerText;

    if (textPronounceCamp.search(/US/) == -1) {
        // dont have US
        const firstMatchList = textPronounceCamp.match(/UK.*\/.*\//);
        const secondMatchList = firstMatchList[0].match(/\/.*\//);

        const errPronounce = 'dontHaveUS';
        const pronounce = `UK: ${secondMatchList[0]}`;
        return {
            errPronounce,
            pronounce
        };
    }

    let errPronounce = '';
    let pronounce = '';

    try {
        const firstMatchList = textPronounceCamp.match(/US.*\/.*\//);
        const secondMatchList = firstMatchList[0].match(/\/.*\//);
        pronounce = secondMatchList[0];
    } catch {
        try {
            errPronounce = 'dontMatchWithUS';
            const secondMatchList = firstMatchList[0].match(/\(.*\)/);
            pronounce = 'US: ' + secondMatchList[0];
        } catch {
            errPronounce = 'dontMatchWithUS';
            const secondMatchList = '';
            pronounce = 'US: ' + secondMatchList[0];
        }
    }

    return {
        errPronounce,
        pronounce
    };
}

const getAudio = async wordreferenceDocument => {
    try {
        const audioSelection = wordreferenceDocument.getElementById('accentSelection');
        const arr = await audioSelection.getElementsByTagName('option');

        let valueAudio;

        for (let j = 0; j < arr.length; j++) {
            if (arr[j].getAttribute('title') == 'US') {
                valueAudio = arr[j].getAttribute('value');
            }
        }

        const audioDom = wordreferenceDocument.getElementById('aud' + valueAudio);
        const audioAdress = audioDom.firstChild.getAttribute('src');

        return audioAdress;
    } catch {
        return;
    }
}

const createWordObj = async(word) => {
    console.log(`word: ${word}`);

    const wordreferenceDocument = await getDom(urlSource + word);
    const title = getTitle(wordreferenceDocument); //not so relevant
    if (title == undefined)
        return {
            word,
            err: 1
        };

    const tableAnswer = getTableAnswer(wordreferenceDocument);
    if (tableAnswer == undefined)
        return {
            word,
            err: 1
        };

    const {
        similar,
        synonym,
        translation,
        sentence
    } = await getAnswer(tableAnswer);
    console.log(`similar: ${similar}`);

    const pronounceCamp = wordreferenceDocument.getElementsByClassName('pwrapper');
    let pronounce;
    if ((pronounceCamp == undefined || pronounceCamp.length == 0) && similar != word) {
        return {
            word,
            err: 2,
            drilldrop: await createWordObj(similar)
        };
    } else if (pronounceCamp == undefined || pronounceCamp.length == 0) {
        pronounce = ''
    } else {
        pronounce = (await getPronounce(pronounceCamp[0])).pronounce;
    }

    console.log(`pronounce: ${pronounce}`);

    const audioSource = await getAudio(wordreferenceDocument);

    const wordObj = {
        word,
        title,
        pronounce,
        similar,
        synonym,
        translation,
        sentence,
        audioSource
    }

    console.log(wordObj);
    return wordObj;

}

const updateCount = () => {
    countSuccessfulWords++;
    document.getElementById('count').innerHTML = countSuccessfulWords;
}

const normalHTML = (successfulSection, element) => {
    if (element.hasOwnProperty('drilldrop')) {
        successfulSection.innerHTML += `<th>`;
        successfulSection.innerHTML += `<h2>${element.word}</h2>`;
        successfulSection.innerHTML += `<h3><a href="${urlSource + element.word}" target="_blank">WordReference</a>   <a href="${urlContextReverso + element.word}" target="_blank">Reverso Context</a></h3>`;
        successfulSection.innerHTML += `</th>`;
        normalHTML(successfulSection, element.drilldrop);
        return;
    }

    successfulSection.innerHTML += `<th>`;
    successfulSection.innerHTML += `<h2>${element.word}</h2>`;
    successfulSection.innerHTML += `<h3><a href="${urlSource + element.word}" target="_blank">WordReference</a>   <a href="${urlContextReverso + element.word}" target="_blank">Reverso Context</a></h3>`;
    successfulSection.innerHTML += '<p>' + element.sentence + '</p>';
    successfulSection.innerHTML += '<p>' + '<b>' + element.similar + ' ' + element.pronounce + '</b></p>';
    successfulSection.innerHTML += '<p>' + element.synonym + ' ' + element.translation + '</p>'
    successfulSection.innerHTML += '<p></p>'
    if (element.audioSource != '' && element.audioSource != undefined) {
        successfulSection.innerHTML += '<audio src=' + urlStandard + element.audioSource + ' controls></audio>';
    }
    successfulSection.innerHTML += '<p></p>';
    successfulSection.innerHTML += `</th>`;
    successfulSection.innerHTML += '<button onclick="updateCount()" class="btn-lg btn-success">Add!</button>';
}

const constructHtml = responses => {
    document.getElementById('successfulSectionTitle').innerHTML = `Successful Words!<div id="count">${countSuccessfulWords}</div>`;
    document.getElementById('faieldSectionTitle').innerHTML = 'Faield Words!';

    const successfulSection = document.getElementById('successfulSection');
    const faieldSection = document.getElementById('faieldSection');
    responses.forEach(element => {
        if (element.err == 1) {
            faieldSection.innerHTML += "<tr>"
            faieldSection.innerHTML += element.word
            faieldSection.innerHTML += "</tr>"
            return;
        }

        successfulSection.innerHTML += '<tr>';
        normalHTML(successfulSection, element);
        successfulSection.innerHTML += '</tr>';
    });

    console.log('Fiinshed!')
}

const main = async() => {
    const words = await getWordsInput();
    let asyncResponses = []
    words.forEach(element => {
        if (element == '') return;
        const response = createWordObj(element);
        asyncResponses.push(response);
    });

    const responses = await Promise.all(asyncResponses);

    constructHtml(responses);
}

// createWordObj('groans');
