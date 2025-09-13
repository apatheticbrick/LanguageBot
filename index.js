let username;

document.getElementById("mySubmit").onclick = function(){
    words = document.getElementById("chars").value;
    email = document.getElementById("email").value;
    exam_desc = document.getElementById("exam_desc").value;
    document.getElementById("myH1").textContent = `Creating exam...`;
}