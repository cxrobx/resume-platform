#import "sections.typ": *
#import "theme.typ": *

#resume-header(
  name: "Your Name",
  address: "City, State",
  contact: [your\@email.com],
)

#section("Experience", [
  #role(company: "Company", date: "20XX -- Present", title: "Title")[
    #bullets(
      [Description of work],
    )
  ]
])
