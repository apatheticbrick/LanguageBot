function submitInput() {
    words = document.getElementById("chars_input").value.replace(/\n/g, " <br> ");
    email = document.getElementById("email_input").value;
    exam_desc = document.getElementById("exam_desc_input").value.replace(/\n/g, " <br> ");
    document.getElementById("myH1").textContent = `Creating exam...`;

    /*console.log(words);*/

    const input_elements = ["chars_input", 
        "email_input", 
        "exam_desc_input", 
        "chars_input_label", 
        "email_input_label", 
        "exam_desc_input_label"
    ]

    input_elements.forEach(function (item, index) {
        document.getElementById(item).style.display = 'none';
    });

    document.getElementById("email_label").textContent = email;
    document.getElementById("chars_label").textContent = words;
    document.getElementById("exam_desc_label").textContent = exam_desc;

    const output_elements = ["info_label_1", 
        "info_label_2",
        "info_label_3",
        "email_label", 
        "chars_label", 
        "exam_desc_label"
    ]

    output_elements.forEach(function (item, index) {
        document.getElementById(item).style.display = 'initial';
    });

    /* document.getElementById("chars_input").style.visibility = 'hidden';
    document.getElementById("email_input").style.visibility = 'hidden';
    document.getElementById("exam_desc_input").style.visibility = 'hidden'; */
}