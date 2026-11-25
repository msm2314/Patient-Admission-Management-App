package com.admissions;

import java.time.LocalDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("patients")
public record Patient(@Id String id, String name, int age, String gender, String ward,
                      String department, String doctor, LocalDate admissionDate, String status) {}
