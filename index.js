const nodemailer = require('nodemailer');

triDetails = {
    user: '', //email here
    pass: '' // pass here
}

// memberDetails = [
//     {
//          id: '',
//          name: '',
//          email: '',
//          preferences: [],
//     }
// ]


async function main(){
    let transporter = nodemailer.createTransport({
        host: '',// hostname,
        port: 587, // for secrure this should be port 465
        secure: false, // need to change
        auth: {
            user: triDetails.user,
            pass: triDetails.pass
        }
    })

     // send mail with defined transport object
    let info = await transporter.sendMail({
        from: '"Fred Foo 👻" <foo@example.com>', // sender address
        to: "bar@example.com, baz@example.com", // list of receivers
        subject: "Hello ✔", // Subject line
        text: "Hello world?", // plain text body
        html: "<b>Hello world?</b>", // html body
    });
}

main().catch(console.error);