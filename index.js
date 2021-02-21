const nodemailer = require('nodemailer');
const prompt = require('prompt');
const csv = require('csv-parser');
const fs = require('fs');

triDetails = {
    user: '', //email here
    pass: '' // pass here
}

var memberDetails = [];

function onErr(err) {
    console.log(err);
    process.exit(1);
}

function generateRandomNumber(limit){
    let randomNumber = Math.random()*(limit);
    return Math.floor(randomNumber);
}

function sendEmail(fromString, toListString, subject, text) {
    try {
        let transporter = nodemailer.createTransport({
            host: 'smtp-mail.outlook.com', // hostname,
            port: 587, // for secure this should be port 465
            secure: false, // need to change
            auth: {
                user: triDetails.user,
                pass: triDetails.pass
            }
        })

        let info = transporter.sendMail({
            from: fromString,
            to: toListString,
            subject: subject,
            text: text
        });

        console.log("Email sent: \n", info)
    } catch (error) {
        console.error(error);
    }
}

function getDetails(){
    console.log("Please enter the sender email and password");
    prompt.start();
    prompt.get(['email', 'password'], function (err, result) {
        if (err) { return onErr(err); }
        triDetails.user = result.email;
        triDetails.pass = result.password;
        console.log("Sender details are as follows:")
        console.log(triDetails)
        loadMemberList();
    });
}

function loadMemberList(){
    const results = [];
    // import list of members
    fs.createReadStream('./TriathlonBlindDatesOne.csv')
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            results.forEach((result) => {
                let preferences = result.PREFERENCES.toLowerCase();
                preferences = preferences.split('/');
                memberDetails.push({
                    id: memberDetails.length,
                    memberName: result.MEMBERS,
                    preferenceList: preferences,
                    emailAddress: result.EMAIL
                })
            })
            console.log("Member list imported: \n")
            console.log(memberDetails);
            console.log("Is this list correct (y/n)")

            prompt.start();
            prompt.get(['answer'], function (err, result) {
                if (err) { return onErr(err); }
                let answer = result.answer;

                answer = answer.toLowerCase();
                if(answer === 'y') {
                    console.log("List accepted");
                    checkListLength();
                } else {
                    console.log("Ending programe, please check your csv");
                    process.exit(1);
                }
            });

        })
}

function checkListLength(){
    let length = memberDetails.length;
    if(length % 2 === 0){
        console.log("List is even in length, will now start matching users");
        matchMembers();
    } else {
        console.log("List is not even, one member must be removed")
        console.log(memberDetails)
        console.log("Please enter a memberID to remove from list")
        prompt.start();
        prompt.get(['memberId'], function (err, result) {
            if (err) { return onErr(err); }
            let id = parseInt(result.memberId);
            try {
                if (id > -1){
                    console.log("Removed: \n", memberDetails[id]);
                    memberDetails.splice(id, 1);
                    matchMembers();
                }
                else {
                    console.log("there was no user matching this id");
                    process.exit(1);
                }
            } catch (err) {
                console.error(err);
                process.exit(1);
            }
        })
    }
}

function matchMembers() {
    let matchQueue = Array.from(memberDetails);

    let matchList = generateMatchList(matchQueue)
    if(matchList.length !== (memberDetails.length / 2)) {
        console.log("Couldn't generate full list")
        console.log("Try again? (y/n)")
        prompt.start();
        prompt.get(['answer'], function (err, result) {
            if (err) { return onErr(err); }
            let answer = result.answer;
            answer = answer.toLowerCase();

            if(answer === 'y') {
                console.log("Trying again");
                matchMembers();
            } else if(answer === 'n'){
                console.log("continuing with the following list remember to match other members")
                console.log(matchList)
                emailMatches(matchList);
            } 
            else {
                console.log("Ending programe");
                process.exit(1);
            }
        });
    } else {
        console.log("matches generated, continuing with emails")
        emailMatches(matchList);
    }
}
    

function generateMatchList(matchQueue) {
    let loopsSinceLastMatch = 0
    let matchList = []
    console.log("match queue is", matchQueue)

    while (matchQueue.length > 0) {
        if(loopsSinceLastMatch > 5){
            return matchList;
        }

        let userOneId = generateRandomNumber(matchQueue.length)
        let userTwoId = generateRandomNumber(matchQueue.length)

        while(userOneId === userTwoId){
            userOneId = generateRandomNumber(matchQueue.length)
            userTwoId = generateRandomNumber(matchQueue.length)
        }

        let userOne = matchQueue[userOneId];
        let userTwo = matchQueue[userTwoId];

        let sharePreferences = userOne.preferenceList.some(r=> userTwo.preferenceList.indexOf(r) >= 0)

        if(sharePreferences) {
            loopsSinceLastMatch = 0
            matchList.push({
                memberOne: memberDetails[userOne.id],
                memberTwo: memberDetails[userTwo.id]
            })
            matchQueue.splice(userOneId, 1)
            if(userOneId < userTwoId) {
                matchQueue.splice(userTwoId -1, 1)
            } else {
                matchQueue.splice(userTwoId, 1)
            }
            
        } else {
            loopsSinceLastMatch ++;
        }
    }

    return matchList;
}

function emailMatches(matchList) {
    console.log("current match list is as follows")
    matchList.forEach(match => {
        console.log(match.memberOne.memberName, "is matched with", match.memberTwo.memberName)
    })
    console.log("are you happy to proceed? (y/n)")

    prompt.get(['answer'], function (err, result) {
        if (err) { return onErr(err); }
        let answer = result.answer;

        answer = answer.toLowerCase();
        if(answer === 'y') {
            console.log("List accepted");
            sendEmails(matchList);
        } else {
            console.log("Ending programe");
            process.exit(1);
        }
    });

    function sendEmails(matchList){
        matchList.forEach(match => {
            let memberOneName = match.memberOne.memberName.toString();
            let memberTwoName = match.memberTwo.memberName.toString();
            let memberOneEmailAddress = match.memberOne.emailAddress.toString();
            let memberTwoEmailAddress = match.memberTwo.emailAddress.toString();
            let memberOnePreferenceList = match.memberOne.preferenceList.toString();
            let memberTwoPreferenceList = match.memberTwo.preferenceList.toString();

            let fromString= '"Team Surrey Triathlon" <' + triDetails.user + '>'
            let toListString = memberOneEmailAddress + ', ' + memberTwoEmailAddress;
            let subject = 'Team Surrey Triathlon Blind Date Match'
            let text = "Dear member, \n\nThe following two members have been matched:\n\n" + memberOneName + "(" + memberOneEmailAddress + ") with the preferences " + memberOnePreferenceList + "\n" + memberTwoName + "(" + memberTwoEmailAddress + ") with the preferences " + memberTwoPreferenceList + "\n\nPlease contact each other with the contact details listed above and decide your sport, day, time and place for your Triathlon Blind Date. \n\nKind Regards, \nTeam Surrey Triathlon \n\nIf you have received this email as an error please contact Jake Wilkins (Tri President) at the email address jw01170@surrey.ac.uk"

            setTimeout(() => {
                sendEmail(fromString, toListString, subject, text)
            }, 1000)
        });
    }
}



getDetails();

// main().catch(console.error);