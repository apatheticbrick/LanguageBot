let username;

function submitInput() {
    /*words = document.getElementById("chars_input").value;*/
    /*email = document.getElementById("email_input").value;*/
    /*exam_desc = document.getElementById("exam_desc_input").value;*/
    document.getElementById("myH1").textContent = `Creating exam...`;

    const input_elements = ["chars_input", 
        "email_input", 
        "exam_desc_input", 
        "chars_input_label", 
        "email_input_label", 
        "exam_desc_input_label"
    ]

    input_elements.forEach(function (item, index) {
        document.getElementById(item).style.visibility = 'hidden'
    });

    /* document.getElementById("chars_input").style.visibility = 'hidden';
    document.getElementById("email_input").style.visibility = 'hidden';
    document.getElementById("exam_desc_input").style.visibility = 'hidden'; */
}