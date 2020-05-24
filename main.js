const getWordsInput = async() => {
    const text = await document.getElementById('words');
    return text.value.split('\n');
}

const getDom = async (url) => {
    const response = await fetch(url);
    const text = await response.text();
    const wordreferenceDocument = new DOMParser().parseFromString(text, "text/html");

    return wordreferenceDocument;
} 

const getTitle = domDocument => domDocument.getElementsByClassName('headerWord')[0].innerText;

const getFirstRowElement = async(firstRow) => {
    const tdsFirstEvenRow = firstRow.getElementsByTagName('td');
    const similarCamp = await tdsFirstEvenRow[0].firstChild.innerText;
    const similar = similarCamp.match(/[a-zA-Z]*/)[0];
    const synonym = await tdsFirstEvenRow[1].innerText;
    const childsThirdTd = tdsFirstEvenRow[2].childNodes;
    const translation = await childsThirdTd[0].nodeValue;

    return {similar, synonym, translation};
}

const getTableAnswer = wordreferenceDocument => {
    const tableResponseList = wordreferenceDocument.getElementsByClassName('WRD');
    return tableResponseList[0];
}

const getAnswer = async tableWRD => {
    const rows = await tableWRD.getElementsByTagName('tr');

    let i = 0;
    while(rows[i].className != 'even') i++;

    const {similar, synonym, translation} = await getFirstRowElement(rows[i]); 

    let sentence;

    try {
        while(rows[i].getElementsByClassName('FrEx').length == 0) i++;
        sentence = rows[i].getElementsByClassName('FrEx')[0].innerText.replace(similar, `<b>${similar}</b>`);
    } catch {
        sentence = '';
    }

    return {similar, synonym, translation, sentence}
}

const getPronounce = async pronounceCamp => {
    const textPronounceCamp = await pronounceCamp.innerText;

    if(textPronounceCamp.search(/US/) == -1 ){
        // dont have US 
        const firstMatchList = textPronounceCamp.match(/UK.*\/.*\//);
        const secondMatchList = firstMatchList[0].match(/\/.*\//);

        const errPronounce = 'dontHaveUS';
        const pronounce = `UK: ${secondMatchList[0]}`;
        return {errPronounce, pronounce};
    }

    let errPronounce = '';
    let pronounce = '';

    try {
        const firstMatchList = textPronounceCamp.match(/US.*\/.*\//);
        const secondMatchList = firstMatchList[0].match(/\/.*\//); 
        pronounce = secondMatchList[0];
    } catch {
        errPronounce = 'dontMatchWithUS';
        pronounce = `US:`;
    }    
    
    return {errPronounce, pronounce};
} 

const createWordObj = async (word) => {
    console.log(`word: ${word}`);

    const wordreferenceDocument = await getDom('https://www.wordreference.com/enpt/' + word);
    const title = getTitle(wordreferenceDocument); //not so relevant 
    
    const tableAnswer = getTableAnswer(wordreferenceDocument);
    if(tableAnswer == undefined)
        return {word, err: 1};

    const {similar, synonym, translation, sentence} = await getAnswer(tableAnswer);
    console.log(`similar: ${similar}`);
    
    const pronounceCamp = wordreferenceDocument.getElementsByClassName('pwrapper');
    let pronounce;
    if((pronounceCamp == undefined || pronounceCamp.length == 0) && similar != word) {
        return {word, err: 2, drilldrop: await createWordObj(similar)};
    } else if(pronounceCamp == undefined || pronounceCamp.length == 0) {
        pronounce = ''
    } else {
        pronounce = (await getPronounce(pronounceCamp[0])).pronounce;
    }

    console.log(`pronounce: ${pronounce}`);

    const wordObj = {word, title, pronounce, similar, synonym, translation, sentence} 
    console.log(wordObj);
    return wordObj;

}

const normalHTML = (successfulSection, element) => {
    if(element.hasOwnProperty('drilldrop')) {
        successfulSection.innerHTML += `<th>` ;
        successfulSection.innerHTML += `<h2>${element.word}</h2>` ;
        successfulSection.innerHTML += `</th>` ;
        normalHTML(successfulSection, element.drilldrop);
        return;   
    }

    successfulSection.innerHTML += `<th>` ;
    successfulSection.innerHTML += `<h2>${element.word}</h2>` ;
    successfulSection.innerHTML += element.sentence + '</br>' ;
    successfulSection.innerHTML += '<b>' + element.similar + ' ' + element.pronounce + '</b></br>';
    successfulSection.innerHTML += element.synonym + ' ' + element.translation + '</br>'
    successfulSection.innerHTML += '</br>'
    successfulSection.innerHTML += `</th>` ;
}

const constructHtml = responses => {
    document.getElementById('successfulSectionTitle').innerHTML = 'Successful Words!';
    document.getElementById('faieldSectionTitle').innerHTML = 'Faield Words!';
    
    const successfulSection = document.getElementById('successfulSection');
    const faieldSection = document.getElementById('faieldSection');
    responses.forEach(element => {
        if(element.err == 1) {
            faieldSection.innerHTML += "<tr>"
            faieldSection.innerHTML += element.word
            faieldSection.innerHTML += "</tr>"
            return;
        }

        successfulSection.innerHTML += '<tr>' ;
        normalHTML(successfulSection, element);
        successfulSection.innerHTML += '</tr>';       
    });
}

const main = async () => {    
    const words = await getWordsInput();
    let asyncResponses = []
    words.forEach(element => {
        if(element == '') return;
        const response = createWordObj(element);
        asyncResponses.push(response);
    });

    const responses = await Promise.all(asyncResponses);

    constructHtml(responses);    
}