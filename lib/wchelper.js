const axios = require("axios");

async function login(){
  try {
    let res = await axios.post("http://api.cup2022.ir/api/v1/user/login",{
      email:"ngaji.ngoding@gmail.com",
      password:"1234asdf"
    },{
      "Content-Type":"application/json"
    });

    return res.data.data.token;
  }catch(err){
    console.log(err.message);
  }
}

module.exports = {login};
